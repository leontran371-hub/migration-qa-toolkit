// Business rules R1-R5 as pure functions over a Dataset. No I/O.
import type { Authorisation, Booking, Dataset, Finding, IsoDate, Practitioner } from '../app/types';
import { TABLES } from '../data/csv';

/** Adds whole days to a YYYY-MM-DD date (UTC, so no timezone drift). */
export function addDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isActiveOn(p: Practitioner, date: IsoDate): boolean {
  return p.activeFrom <= date && (p.activeTo === null || date <= p.activeTo);
}

export function isWithin(a: Authorisation, date: IsoDate): boolean {
  return a.startDate <= date && date <= a.endDate;
}

/** Sum of booking hours per authorisation id (bookings without one are ignored). */
export function bookedHours(bookings: readonly Booking[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const b of bookings) {
    if (b.authorisationId !== null) totals.set(b.authorisationId, (totals.get(b.authorisationId) ?? 0) + b.durationHours);
  }
  return totals;
}

const byId = <T extends { externalId: string }>(rows: readonly T[]) => new Map(rows.map((r) => [r.externalId, r]));

/** R1: booking date within its authorisation's start and end dates. */
export function checkR1(ds: Dataset): Finding[] {
  const auths = byId(ds.authorisations);
  return ds.bookings.flatMap((b): Finding[] => {
    const auth = b.authorisationId === null ? undefined : auths.get(b.authorisationId);
    if (!auth || isWithin(auth, b.date)) return [];
    return [{ rule: 'R1', object: 'Booking', externalId: b.externalId, expected: `${auth.startDate}..${auth.endDate}`, actual: b.date }];
  });
}

/** R2: booked hours on an authorisation never exceed hours approved. */
export function checkR2(ds: Dataset): Finding[] {
  const totals = bookedHours(ds.bookings);
  return ds.authorisations.flatMap((a): Finding[] => {
    const booked = totals.get(a.externalId) ?? 0;
    if (booked <= a.hoursApproved) return [];
    return [{ rule: 'R2', object: 'Authorisation', externalId: a.externalId, expected: `<= ${a.hoursApproved}`, actual: String(booked) }];
  });
}

/** R3: every booking references an existing authorisation. */
export function checkR3(ds: Dataset): Finding[] {
  const auths = byId(ds.authorisations);
  return ds.bookings.flatMap((b): Finding[] => {
    if (b.authorisationId !== null && auths.has(b.authorisationId)) return [];
    return [{ rule: 'R3', object: 'Booking', externalId: b.externalId, expected: 'an authorisation', actual: b.authorisationId ?? 'none' }];
  });
}

function inactiveReason(p: Practitioner | undefined, id: string, date: IsoDate): string {
  if (!p) return `practitioner ${id} not found`;
  if (date < p.activeFrom) return `active from ${p.activeFrom}`;
  return `inactive from ${addDays(p.activeTo as IsoDate, 1)}`;
}

/** R4: booking's practitioner is active on the booking date. */
export function checkR4(ds: Dataset): Finding[] {
  const practitioners = byId(ds.practitioners);
  return ds.bookings.flatMap((b): Finding[] => {
    const p = practitioners.get(b.practitionerId);
    if (p && isActiveOn(p, b.date)) return [];
    return [{ rule: 'R4', object: 'Booking', externalId: b.externalId, expected: `active on ${b.date}`, actual: inactiveReason(p, b.practitionerId, b.date) }];
  });
}

const show = (v: unknown) => (v === null || v === undefined ? 'null' : String(v));

/** R5: every source record exists in the target with every field equal. One-directional. */
export function checkR5(source: Dataset, target: Dataset): Finding[] {
  return TABLES.flatMap(({ key, object, fields }) => {
    const targetRows = byId<{ externalId: string }>(target[key]);
    return (source[key] as { externalId: string }[]).flatMap((s): Finding[] => {
      const t = targetRows.get(s.externalId);
      if (!t) return [{ rule: 'R5', object, externalId: s.externalId, expected: 'present', actual: 'missing' }];
      const sv = s as Record<string, unknown>;
      const tv = t as Record<string, unknown>;
      return fields
        .filter((f) => show(sv[f]) !== show(tv[f]))
        .map((f) => ({ rule: 'R5', object, externalId: s.externalId, field: f, expected: show(sv[f]), actual: show(tv[f]) }));
    });
  });
}

/** R1-R4 on the target, plus R5 source-to-target. */
export function checkAll(source: Dataset, target: Dataset): Finding[] {
  return [...checkR1(target), ...checkR2(target), ...checkR3(target), ...checkR4(target), ...checkR5(source, target)];
}
