import { describe, expect, it } from 'vitest';
import { compare, type KnownDefect } from './engine';
import { booking, client, dataset } from './test-data';

const source = dataset();
const target = dataset({ clients: [client({ lastName: 'Exampl' })], bookings: [booking({ date: '2026-07-01' })] });
const known: KnownDefect[] = [
  { defect: 'D1', rule: 'R1', object: 'Booking', externalId: 'BKG-0001' },
  { defect: 'D5', rule: 'R5', object: 'Client', externalId: 'CLI-0001', field: 'lastName' },
];

describe('compare', () => {
  it('reports zero findings and all checks passed for identical clean data', () => {
    const result = compare(source, source, [], '2026-11-01');
    expect(result.findings).toEqual([]);
    // 1 booking x (R1, R3, R4) + 1 authorisation (R2) + 5 source records (R5)
    expect(result.summary).toEqual({ totalChecked: 9, passed: 9, failed: 0, known: 0 });
  });

  it('marks unlisted findings as FAILED', () => {
    const result = compare(source, target, [], '2026-11-01');
    expect(result.findings.map((f) => f.status)).toEqual(['FAILED', 'FAILED', 'FAILED']);
    expect(result.summary.failed).toBe(3);
  });

  it('marks listed findings as KNOWN with their defect id', () => {
    const result = compare(source, target, known, '2026-11-01');
    const r1 = result.findings.find((f) => f.rule === 'R1');
    expect(r1).toMatchObject({ status: 'KNOWN', defect: 'D1' });
  });

  it('still fails a finding on a known record when the field differs from the listed one', () => {
    const result = compare(source, target, known, '2026-11-01');
    // The booking date change also breaks R5 on BKG-0001.date, which is not on the known list.
    expect(result.findings.filter((f) => f.status === 'FAILED')).toEqual([
      expect.objectContaining({ rule: 'R5', externalId: 'BKG-0001', field: 'date' }),
    ]);
    expect(result.summary).toMatchObject({ failed: 1, known: 2 });
  });
});
