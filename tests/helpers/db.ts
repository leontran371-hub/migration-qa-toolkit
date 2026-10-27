// Read-only access to the target SQLite DB for database-layer assertions.
// Column lists come from data/csv.ts TABLES, the same source the seeder and comparison engine use.
import Database from 'better-sqlite3';
import type { Authorisation, Booking, Client, Dataset } from '../../app/types';
import { TABLES } from '../../data/csv';
import { bookedHours } from '../../compare/rules';

export class TargetDb {
  private readonly db: Database.Database;

  constructor(path: string) {
    this.db = new Database(path, { readonly: true, fileMustExist: true });
  }

  client(id: string): Client | undefined {
    return this.byId<Client>('clients', id);
  }

  authorisation(id: string): Authorisation | undefined {
    return this.byId<Authorisation>('authorisations', id);
  }

  booking(id: string): Booking | undefined {
    return this.byId<Booking>('bookings', id);
  }

  bookingsForAuthorisation(authId: string): Booking[] {
    return this.db
      .prepare(`SELECT ${this.columns('bookings')} FROM bookings WHERE authorisationId = ? ORDER BY externalId`)
      .all(authId) as Booking[];
  }

  /** Total booked hours on one authorisation, using the same sum as rule R2. */
  bookedHours(authId: string): number {
    return bookedHours(this.bookingsForAuthorisation(authId)).get(authId) ?? 0;
  }

  close(): void {
    this.db.close();
  }

  private columns(table: keyof Dataset): string {
    const spec = TABLES.find((t) => t.key === table);
    if (!spec) throw new Error(`Unknown table ${table}`);
    return spec.fields.join(', ');
  }

  private byId<T>(table: keyof Dataset, id: string): T | undefined {
    return this.db.prepare(`SELECT ${this.columns(table)} FROM ${table} WHERE externalId = ?`).get(id) as T | undefined;
  }
}
