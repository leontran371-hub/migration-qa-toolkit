// View models for the generic list and detail templates.
import type { Authorisation, Booking, Client } from './types';

export type EntityKey = 'client' | 'authorisation' | 'booking';

export interface EntityView<T> {
  /** data-testid prefix, e.g. "client" gives client-table, client-row-<id>. */
  key: EntityKey;
  title: string;
  singular: string;
  basePath: string;
  /** Every field of T with its display label, in display order. */
  labels: Record<keyof T & string, string>;
  /** Fields holding an External ID that has its own detail page. */
  links: Partial<Record<keyof T & string, string>>;
}

export interface Cell {
  field: string;
  label: string;
  text: string;
  href: string | null;
}

export interface ListRow {
  id: string;
  href: string;
  cells: Cell[];
}

export const clientView: EntityView<Client> = {
  key: 'client',
  title: 'Clients',
  singular: 'Client',
  basePath: '/clients',
  labels: {
    externalId: 'External ID',
    firstName: 'First name',
    lastName: 'Last name',
    dateOfBirth: 'Date of birth',
    status: 'Status',
  },
  links: {},
};

export const authorisationView: EntityView<Authorisation> = {
  key: 'authorisation',
  title: 'Authorisations',
  singular: 'Authorisation',
  basePath: '/authorisations',
  labels: {
    externalId: 'External ID',
    clientId: 'Client',
    funderId: 'Funder',
    startDate: 'Start date',
    endDate: 'End date',
    hoursApproved: 'Hours approved',
    hoursRemaining: 'Hours remaining',
    status: 'Status',
  },
  links: { clientId: '/clients' },
};

export const bookingView: EntityView<Booking> = {
  key: 'booking',
  title: 'Bookings',
  singular: 'Booking',
  basePath: '/bookings',
  labels: {
    externalId: 'External ID',
    clientId: 'Client',
    practitionerId: 'Practitioner',
    authorisationId: 'Authorisation',
    date: 'Date',
    durationHours: 'Duration (hours)',
    status: 'Status',
  },
  links: { clientId: '/clients', authorisationId: '/authorisations' },
};

/** Null is shown as "None" (e.g. a booking with no authorisation, defect D3). */
export function displayValue(value: unknown): string {
  return value === null || value === undefined ? 'None' : String(value);
}

export function toCells<T extends { externalId: string }>(view: EntityView<T>, record: T): Cell[] {
  return (Object.keys(view.labels) as (keyof T & string)[]).map((field) => {
    const value = record[field];
    const base = view.links[field];
    return {
      field,
      label: view.labels[field],
      text: displayValue(value),
      href: base && typeof value === 'string' ? `${base}/${encodeURIComponent(value)}` : null,
    };
  });
}

export function toRows<T extends { externalId: string }>(view: EntityView<T>, records: T[]): ListRow[] {
  return records.map((record) => ({
    id: record.externalId,
    href: `${view.basePath}/${encodeURIComponent(record.externalId)}`,
    cells: toCells(view, record),
  }));
}
