// Read-only data access for the target system database.
import Database from 'better-sqlite3';
import type { Authorisation, Booking, Client } from './types';

export interface TargetDb {
  listClients(search?: string): Client[];
  getClient(id: string): Client | undefined;
  listAuthorisations(): Authorisation[];
  getAuthorisation(id: string): Authorisation | undefined;
  listBookings(): Booking[];
  getBooking(id: string): Booking | undefined;
  close(): void;
}

/** Column list for SELECT; the Record type forces every field of T to be listed. */
function columnsOf<T>(fields: Record<keyof T, true>): string {
  return Object.keys(fields).join(', ');
}

const CLIENT_COLUMNS = columnsOf<Client>({
  externalId: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  status: true,
});

const AUTHORISATION_COLUMNS = columnsOf<Authorisation>({
  externalId: true,
  clientId: true,
  funderId: true,
  startDate: true,
  endDate: true,
  hoursApproved: true,
  hoursRemaining: true,
  status: true,
});

const BOOKING_COLUMNS = columnsOf<Booking>({
  externalId: true,
  clientId: true,
  practitionerId: true,
  authorisationId: true,
  date: true,
  durationHours: true,
  status: true,
});

/** Escape LIKE wildcards so the search text is matched literally. */
function likePattern(search: string): string {
  return `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export function openTargetDb(path: string): TargetDb {
  const db = new Database(path, { readonly: true, fileMustExist: true });

  const allClients = db.prepare(`SELECT ${CLIENT_COLUMNS} FROM clients ORDER BY externalId`);
  // SQLite LIKE is case-insensitive for ASCII letters.
  const searchClients = db.prepare(
    `SELECT ${CLIENT_COLUMNS} FROM clients
     WHERE externalId LIKE @pattern ESCAPE '\\'
        OR firstName LIKE @pattern ESCAPE '\\'
        OR lastName LIKE @pattern ESCAPE '\\'
        OR (firstName || ' ' || lastName) LIKE @pattern ESCAPE '\\'
     ORDER BY externalId`,
  );
  const oneClient = db.prepare(`SELECT ${CLIENT_COLUMNS} FROM clients WHERE externalId = ?`);
  const allAuthorisations = db.prepare(
    `SELECT ${AUTHORISATION_COLUMNS} FROM authorisations ORDER BY externalId`,
  );
  const oneAuthorisation = db.prepare(
    `SELECT ${AUTHORISATION_COLUMNS} FROM authorisations WHERE externalId = ?`,
  );
  const allBookings = db.prepare(`SELECT ${BOOKING_COLUMNS} FROM bookings ORDER BY externalId`);
  const oneBooking = db.prepare(`SELECT ${BOOKING_COLUMNS} FROM bookings WHERE externalId = ?`);

  return {
    listClients(search) {
      const term = search?.trim();
      return (term
        ? searchClients.all({ pattern: likePattern(term) })
        : allClients.all()) as Client[];
    },
    getClient: (id) => oneClient.get(id) as Client | undefined,
    listAuthorisations: () => allAuthorisations.all() as Authorisation[],
    getAuthorisation: (id) => oneAuthorisation.get(id) as Authorisation | undefined,
    listBookings: () => allBookings.all() as Booking[],
    getBooking: (id) => oneBooking.get(id) as Booking | undefined,
    close: () => db.close(),
  };
}
