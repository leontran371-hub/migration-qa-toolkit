// Seeded defects D1-D6, applied to the target DB after the clean load.
// Each defect is chosen deterministically from the clean data and causes exactly one finding.
import type { Database } from 'better-sqlite3';
import type { Authorisation, Booking, BookingId, Client, ClientId, Dataset, IsoDate, PractitionerId } from '../app/types';
import { env } from '../app/env';
import { addDays, bookedHours, isActiveOn, isWithin } from '../compare/rules';
import { TABLES, type TableSpec } from './csv';

/** The IDs the defects use. planDefects() re-derives them and fails loudly if the data no longer matches. */
export const SEEDED_DEFECTS = {
  D1: { rule: 'R1', bookingId: 'BKG-0061', authorisationId: 'AUT-0001' },
  D2: { rule: 'R2', bookingIds: ['BKG-0062', 'BKG-0063', 'BKG-0064'], authorisationId: 'AUT-0012' },
  D3: { rule: 'R3', bookingId: 'BKG-0065', clientId: 'CLI-0003' },
  D4: { rule: 'R4', bookingId: 'BKG-0066', authorisationId: 'AUT-0002', practitionerId: 'PRA-0005' },
  D5: { rule: 'R5', clientId: 'CLI-0004', field: 'lastName' },
  D6: { rule: 'R5', clientId: 'CLI-0020' },
} as const;

export type DefectId = keyof typeof SEEDED_DEFECTS;

const INACTIVE_PRACTITIONER: PractitionerId = 'PRA-0005';
const FIRST_INACTIVE_DAY: IsoDate = '2026-10-16'; // strictly after 2026-10-15

// ---------- SQLite helpers (shared with db/seed.ts) ----------

export function insertRows(db: Database, spec: TableSpec, rows: readonly object[]): void {
  const sql = `INSERT INTO ${spec.key} (${spec.fields.join(', ')}) VALUES (${spec.fields.map((f) => `@${f}`).join(', ')})`;
  const stmt = db.prepare(sql);
  for (const row of rows) stmt.run(row);
}

const tableSpec = (key: keyof Dataset) => TABLES.find((t) => t.key === key)!;

export function readDatasetFromDb(db: Database): Dataset {
  const entries = TABLES.map((t) => [t.key, db.prepare(`SELECT ${t.fields.join(', ')} FROM ${t.key} ORDER BY externalId`).all()]);
  return Object.fromEntries(entries) as unknown as Dataset;
}

// ---------- Defect selection ----------

interface DefectPlan {
  ids: typeof SEEDED_DEFECTS;
  newBookings: Booking[];
  renamedClient: { clientId: ClientId; lastName: string };
  deletedClientId: ClientId;
}

const bookingId = (n: number) => `BKG-${String(n).padStart(4, '0')}` as BookingId;
const halfHourCeil = (h: number) => Math.ceil(h * 2) / 2;

function firstActivePractitioner(ds: Dataset, date: IsoDate): PractitionerId {
  const p = ds.practitioners.find((x) => x.activeTo === null && isActiveOn(x, date));
  if (!p) throw new Error(`No active practitioner on ${date}`);
  return p.externalId;
}

function makeBooking(n: number, clientId: ClientId, practitionerId: PractitionerId, auth: Authorisation | null, date: IsoDate, hours: number): Booking {
  return {
    externalId: bookingId(n),
    clientId,
    practitionerId,
    authorisationId: auth?.externalId ?? null,
    date,
    durationHours: hours,
    status: date < env.referenceDate ? 'Completed' : 'Scheduled',
  };
}

/** Picks the defect records from the clean data. Pure: same data in, same plan out. */
export function planDefects(clean: Dataset): DefectPlan {
  const booked = bookedHours(clean.bookings);
  const spare = (a: Authorisation) => a.hoursApproved - (booked.get(a.externalId) ?? 0);
  const auths = [...clean.authorisations].sort((a, b) => a.externalId.localeCompare(b.externalId));
  let next = clean.bookings.length + 1;

  // D1 (R1): first authorisation; one booking a week after its end date.
  const d1Auth = auths[0];
  const d1Date = addDays(d1Auth.endDate, 7);
  const d1 = makeBooking(next++, d1Auth.clientId, firstActivePractitioner(clean, d1Date), d1Auth, d1Date, 2);

  // D2 (R2): authorisation with the least spare hours (ties by id); three equal bookings that together exceed it.
  const d2Auth = auths.filter((a) => a !== d1Auth).sort((a, b) => spare(a) - spare(b))[0];
  const d2Hours = halfHourCeil((spare(d2Auth) + 0.5) / 3);
  const d2 = [0, 1, 2].map((i) => {
    const date = addDays(d2Auth.startDate, i);
    return makeBooking(next++, d2Auth.clientId, firstActivePractitioner(clean, date), d2Auth, date, d2Hours);
  });

  // D4 (R4): first other authorisation still running after 2026-10-15; booking with the inactive practitioner.
  const d4Auth = auths.find((a) => a !== d1Auth && a !== d2Auth && isWithin(a, FIRST_INACTIVE_DAY));
  if (!d4Auth) throw new Error('No authorisation covers ' + FIRST_INACTIVE_DAY);

  // D3 (R3): first served client not used by D1/D2/D4; booking with no authorisation.
  const usedClients = new Set([d1Auth.clientId, d2Auth.clientId, d4Auth.clientId]);
  const servedClients = new Set(clean.authorisations.map((a) => a.clientId));
  const freeClients = clean.clients.filter((c) => servedClients.has(c.externalId) && !usedClients.has(c.externalId));
  const d3Client = freeClients[0];
  const d3 = makeBooking(next++, d3Client.externalId, firstActivePractitioner(clean, env.referenceDate), null, env.referenceDate, 1);

  const d4 = makeBooking(next++, d4Auth.clientId, INACTIVE_PRACTITIONER, d4Auth, FIRST_INACTIVE_DAY, 2);

  // D5 (R5): next free client; last name truncated by one character (a classic migration defect).
  const d5Client: Client = freeClients[1];

  // D6 (R5): the client with no authorisations, cases or bookings.
  const linked = new Set([...clean.authorisations, ...clean.cases, ...clean.bookings].map((r) => r.clientId));
  const d6Client = clean.clients.find((c) => !linked.has(c.externalId));
  if (!d6Client) throw new Error('No unlinked client for D6');

  const ids = {
    D1: { rule: 'R1', bookingId: d1.externalId, authorisationId: d1Auth.externalId },
    D2: { rule: 'R2', bookingIds: d2.map((b) => b.externalId), authorisationId: d2Auth.externalId },
    D3: { rule: 'R3', bookingId: d3.externalId, clientId: d3Client.externalId },
    D4: { rule: 'R4', bookingId: d4.externalId, authorisationId: d4Auth.externalId, practitionerId: INACTIVE_PRACTITIONER },
    D5: { rule: 'R5', clientId: d5Client.externalId, field: 'lastName' },
    D6: { rule: 'R5', clientId: d6Client.externalId },
  };
  if (JSON.stringify(ids) !== JSON.stringify(SEEDED_DEFECTS)) {
    throw new Error(`Defect IDs drifted from SEEDED_DEFECTS; update it and docs/seeded-defects.md:\n${JSON.stringify(ids, null, 2)}`);
  }

  return {
    ids: SEEDED_DEFECTS,
    newBookings: [d1, ...d2, d3, d4],
    renamedClient: { clientId: d5Client.externalId, lastName: d5Client.lastName.slice(0, -1) },
    deletedClientId: d6Client.externalId,
  };
}

/** Applies D1-D6 on top of the clean target. Authorisation rows are never touched. */
export function applyDefects(db: Database): void {
  const plan = planDefects(readDatasetFromDb(db));
  db.transaction(() => {
    insertRows(db, tableSpec('bookings'), plan.newBookings);
    db.prepare('UPDATE clients SET lastName = ? WHERE externalId = ?').run(plan.renamedClient.lastName, plan.renamedClient.clientId);
    db.prepare('DELETE FROM clients WHERE externalId = ?').run(plan.deletedClientId);
  })();
}
