import { describe, expect, it } from 'vitest';
import { checkR1, checkR2, checkR3, checkR4, checkR5 } from './rules';
import { authorisation, booking, client, dataset, practitioner } from './test-data';

describe('R1 booking date within authorisation dates', () => {
  it('passes on the start and end dates', () => {
    const ds = dataset({ bookings: [booking({ date: '2026-01-01' }), booking({ externalId: 'BKG-0002', date: '2026-06-30' })] });
    expect(checkR1(ds)).toEqual([]);
  });

  it('fails a booking after the end date', () => {
    expect(checkR1(dataset({ bookings: [booking({ date: '2026-07-01' })] }))).toEqual([
      { rule: 'R1', object: 'Booking', externalId: 'BKG-0001', expected: '2026-01-01..2026-06-30', actual: '2026-07-01' },
    ]);
  });
});

describe('R2 booked hours within hours approved', () => {
  it('passes when hours equal the approval', () => {
    const ds = dataset({ bookings: [booking({ durationHours: 6 }), booking({ externalId: 'BKG-0002', durationHours: 4 })] });
    expect(checkR2(ds)).toEqual([]);
  });

  it('fails once with the total when hours exceed the approval', () => {
    const ds = dataset({ bookings: [booking({ durationHours: 6 }), booking({ externalId: 'BKG-0002', durationHours: 4.5 })] });
    expect(checkR2(ds)).toEqual([{ rule: 'R2', object: 'Authorisation', externalId: 'AUT-0001', expected: '<= 10', actual: '10.5' }]);
  });
});

describe('R3 every booking has an authorisation', () => {
  it('passes when the authorisation exists', () => {
    expect(checkR3(dataset())).toEqual([]);
  });

  it('fails a booking with no authorisation', () => {
    expect(checkR3(dataset({ bookings: [booking({ authorisationId: null })] }))).toEqual([
      { rule: 'R3', object: 'Booking', externalId: 'BKG-0001', expected: 'an authorisation', actual: 'none' },
    ]);
  });

  it('fails a booking whose authorisation does not exist', () => {
    expect(checkR3(dataset({ bookings: [booking({ authorisationId: 'AUT-0999' })] }))[0]?.actual).toBe('AUT-0999');
  });
});

describe('R4 practitioner active on the booking date', () => {
  it('passes on the practitioner’s last active day', () => {
    expect(checkR4(dataset({ practitioners: [practitioner({ activeTo: '2026-03-01' })] }))).toEqual([]);
  });

  it('fails the day after the practitioner becomes inactive', () => {
    const ds = dataset({ practitioners: [practitioner({ activeTo: '2026-02-28' })] });
    expect(checkR4(ds)).toEqual([
      { rule: 'R4', object: 'Booking', externalId: 'BKG-0001', expected: 'active on 2026-03-01', actual: 'inactive from 2026-03-01' },
    ]);
  });
});

describe('R5 every source record exists in the target with matching fields', () => {
  it('passes when source and target are identical', () => {
    expect(checkR5(dataset(), dataset())).toEqual([]);
  });

  it('ignores records that exist only in the target', () => {
    const target = dataset({ clients: [client(), client({ externalId: 'CLI-0002' })] });
    expect(checkR5(dataset(), target)).toEqual([]);
  });

  it('fails one field that differs', () => {
    expect(checkR5(dataset(), dataset({ clients: [client({ lastName: 'Exampl' })] }))).toEqual([
      { rule: 'R5', object: 'Client', externalId: 'CLI-0001', field: 'lastName', expected: 'Example', actual: 'Exampl' },
    ]);
  });

  it('fails a record missing from the target', () => {
    expect(checkR5(dataset(), dataset({ clients: [] }))).toEqual([
      { rule: 'R5', object: 'Client', externalId: 'CLI-0001', expected: 'present', actual: 'missing' },
    ]);
  });

  it('treats null and a value as different', () => {
    const findings = checkR5(dataset(), dataset({ bookings: [booking({ authorisationId: null })] }));
    expect(findings).toEqual([
      { rule: 'R5', object: 'Booking', externalId: 'BKG-0001', field: 'authorisationId', expected: 'AUT-0001', actual: 'null' },
    ]);
  });
});
