// Runs R1-R5 and classifies each finding as FAILED or KNOWN. Pure: no I/O.
import type { Dataset, Finding, ObjectName, RuleId } from '../app/types';
import { TABLES } from '../data/csv';
import { checkAll } from './rules';

export interface KnownDefect {
  defect: string;
  rule: RuleId;
  object: ObjectName;
  externalId: string;
  field?: string;
}

export interface ReportedFinding extends Finding {
  status: 'FAILED' | 'KNOWN';
  /** Seeded defect id when the finding is on the known list. */
  defect?: string;
}

export interface CompareSummary {
  totalChecked: number;
  passed: number;
  failed: number;
  known: number;
}

export interface CompareResult {
  referenceDate: string;
  summary: CompareSummary;
  findings: ReportedFinding[];
}

const sameCheck = (a: Pick<Finding, 'rule' | 'object' | 'externalId'>, b: Pick<Finding, 'rule' | 'object' | 'externalId'>) =>
  a.rule === b.rule && a.object === b.object && a.externalId === b.externalId;

export function matchKnown(finding: Finding, known: readonly KnownDefect[]): KnownDefect | undefined {
  return known.find((k) => sameCheck(k, finding) && (k.field ?? null) === (finding.field ?? null));
}

/** One check per (rule, record): R1, R3, R4 per target booking, R2 per target authorisation, R5 per source record. */
export function countChecks(source: Dataset, target: Dataset): number {
  const sourceRecords = TABLES.reduce((n, t) => n + source[t.key].length, 0);
  return target.bookings.length * 3 + target.authorisations.length + sourceRecords;
}

export function compare(source: Dataset, target: Dataset, known: readonly KnownDefect[], referenceDate: string): CompareResult {
  const findings: ReportedFinding[] = checkAll(source, target).map((f) => {
    const match = matchKnown(f, known);
    return match ? { ...f, status: 'KNOWN', defect: match.defect } : { ...f, status: 'FAILED' };
  });

  // A check fails if any of its findings is unknown; it is known if all of its findings are known.
  const checks = new Map<string, ReportedFinding['status']>();
  for (const f of findings) {
    const key = `${f.rule}|${f.object}|${f.externalId}`;
    checks.set(key, checks.get(key) === 'FAILED' ? 'FAILED' : f.status);
  }
  const failed = [...checks.values()].filter((s) => s === 'FAILED').length;
  const knownCount = checks.size - failed;
  const totalChecked = countChecks(source, target);

  return {
    referenceDate,
    summary: { totalChecked, passed: totalChecked - checks.size, failed, known: knownCount },
    findings,
  };
}
