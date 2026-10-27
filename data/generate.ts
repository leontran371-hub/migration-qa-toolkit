// Generates the clean dataset into data/source/*.csv. Fixed seed + fixed reference date = byte-identical output.
import { fakerEN_AU as faker } from '@faker-js/faker';
import { env } from '../app/env';
import type { Authorisation, Booking, Case, Client, Dataset, Funder, IsoDate, Practitioner } from '../app/types';
import { addDays, bookedHours, isActiveOn } from '../compare/rules';
import { writeDataset } from './csv';

const COUNTS = { clients: 20, practitioners: 5, funders: 3, authorisations: 25, cases: 20, bookings: 60 };
/** PRA-0005's last active day (inactive from 2026-10-15). */
const INACTIVE_PRACTITIONER_LAST_DAY = '2026-10-14';
/** Head-room left on every authorisation so seeded defects can add bookings without breaking R2. */
const MIN_SPARE_HOURS = 10;

const REF: IsoDate = env.referenceDate;

faker.seed(42);
faker.setDefaultRefDate(`${REF}T00:00:00Z`);

const extId = <P extends string>(prefix: P, n: number) => `${prefix}-${String(n).padStart(4, '0')}` as `${P}-${string}`;
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const isoDate = (d: Date): IsoDate => d.toISOString().slice(0, 10);
const randomDate = (from: IsoDate, maxDays: number): IsoDate => addDays(from, faker.number.int({ min: 0, max: maxDays }));
const daysBetween = (from: IsoDate, to: IsoDate) => (Date.parse(to) - Date.parse(from)) / 86_400_000;

function makeClients(): Client[] {
  return range(COUNTS.clients).map((n) => ({
    externalId: extId('CLI', n),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    dateOfBirth: isoDate(faker.date.birthdate({ mode: 'age', min: 18, max: 90 })),
    status: faker.datatype.boolean({ probability: 0.85 }) ? 'Active' : 'Inactive',
  }));
}

function makePractitioners(): Practitioner[] {
  return range(COUNTS.practitioners).map((n) => ({
    externalId: extId('PRA', n),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    activeFrom: randomDate('2019-01-01', 2000), // 2019-2024, well before the first booking
    activeTo: n === COUNTS.practitioners ? INACTIVE_PRACTITIONER_LAST_DAY : null,
  }));
}

function makeFunders(): Funder[] {
  return range(COUNTS.funders).map((n) => ({ externalId: extId('FUN', n), name: `${faker.company.name()} Health Fund` }));
}

/** Clients that get authorisations, cases and bookings. The last client gets none (it is deleted in the target for D6). */
const servedClients = (clients: Client[]) => clients.slice(0, -1);

function makeAuthorisations(clients: Client[], funders: Funder[]): Omit<Authorisation, 'hoursRemaining' | 'status'>[] {
  const served = servedClients(clients);
  return range(COUNTS.authorisations).map((n) => {
    // Every served client gets one; the rest go to random served clients.
    const client = n <= served.length ? served[n - 1] : faker.helpers.arrayElement(served);
    const startDate = randomDate('2025-07-01', 450);
    return {
      externalId: extId('AUT', n),
      clientId: client.externalId,
      funderId: faker.helpers.arrayElement(funders).externalId,
      startDate,
      endDate: addDays(startDate, faker.helpers.arrayElement([90, 180, 365]) - 1),
      hoursApproved: faker.number.int({ min: 20, max: 60 }),
    };
  });
}

function makeCases(clients: Client[], auths: Omit<Authorisation, 'hoursRemaining' | 'status'>[]): Case[] {
  const served = servedClients(clients);
  return range(COUNTS.cases).map((n) => {
    const client = n <= served.length ? served[n - 1] : faker.helpers.arrayElement(served);
    const funderId = auths.find((a) => a.clientId === client.externalId)!.funderId;
    const openedDate = randomDate('2025-06-01', 450);
    const closedDate = faker.datatype.boolean({ probability: 0.4 }) ? addDays(openedDate, faker.number.int({ min: 30, max: 400 })) : null;
    const closed = closedDate !== null && closedDate <= REF;
    return { externalId: extId('CAS', n), clientId: client.externalId, funderId, openedDate, closedDate, status: closed ? 'Closed' : 'Open' };
  });
}

function makeBookings(auths: Omit<Authorisation, 'hoursRemaining' | 'status'>[], practitioners: Practitioner[]): Booking[] {
  // Each authorisation gets 2 or 3 bookings (max 9 hours), so 20+ approved hours always leaves >= 10 spare.
  const extra = faker.helpers.arrayElements(auths, COUNTS.bookings - 2 * auths.length);
  const assigned = faker.helpers.shuffle([...auths, ...auths, ...extra]);
  return assigned.map((auth, i) => {
    const date = randomDate(auth.startDate, daysBetween(auth.startDate, auth.endDate));
    return {
      externalId: extId('BKG', i + 1),
      clientId: auth.clientId,
      practitionerId: faker.helpers.arrayElement(practitioners.filter((p) => isActiveOn(p, date))).externalId,
      authorisationId: auth.externalId,
      date,
      durationHours: faker.helpers.arrayElement([1, 1.5, 2, 2.5, 3]),
      status: date < REF ? 'Completed' : 'Scheduled',
    };
  });
}

function finaliseAuthorisations(auths: Omit<Authorisation, 'hoursRemaining' | 'status'>[], bookings: Booking[]): Authorisation[] {
  const totals = bookedHours(bookings);
  return auths.map((a) => {
    const hoursRemaining = a.hoursApproved - (totals.get(a.externalId) ?? 0);
    if (hoursRemaining < MIN_SPARE_HOURS) throw new Error(`${a.externalId} has only ${hoursRemaining} spare hours`);
    return { ...a, hoursRemaining, status: a.endDate < REF ? 'Expired' : 'Active' };
  });
}

function generateDataset(): Dataset {
  const clients = makeClients();
  const practitioners = makePractitioners();
  const funders = makeFunders();
  const draftAuths = makeAuthorisations(clients, funders);
  const cases = makeCases(clients, draftAuths);
  const bookings = makeBookings(draftAuths, practitioners);
  const authorisations = finaliseAuthorisations(draftAuths, bookings);
  return { clients, practitioners, funders, authorisations, cases, bookings };
}

writeDataset('data/source', generateDataset());
console.log('Wrote data/source/*.csv');
