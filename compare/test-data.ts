// Typed builders for unit tests: a minimal valid dataset plus per-record overrides.
import type { Authorisation, Booking, Client, Dataset, Funder, Practitioner } from '../app/types';

export const funder = (o: Partial<Funder> = {}): Funder => ({ externalId: 'FUN-0001', name: 'Test Funder', ...o });

export const client = (o: Partial<Client> = {}): Client => ({
  externalId: 'CLI-0001',
  firstName: 'Ada',
  lastName: 'Example',
  dateOfBirth: '1990-01-01',
  status: 'Active',
  ...o,
});

export const practitioner = (o: Partial<Practitioner> = {}): Practitioner => ({
  externalId: 'PRA-0001',
  firstName: 'Pat',
  lastName: 'Sample',
  activeFrom: '2025-01-01',
  activeTo: null,
  ...o,
});

export const authorisation = (o: Partial<Authorisation> = {}): Authorisation => ({
  externalId: 'AUT-0001',
  clientId: 'CLI-0001',
  funderId: 'FUN-0001',
  startDate: '2026-01-01',
  endDate: '2026-06-30',
  hoursApproved: 10,
  hoursRemaining: 8,
  status: 'Expired',
  ...o,
});

export const booking = (o: Partial<Booking> = {}): Booking => ({
  externalId: 'BKG-0001',
  clientId: 'CLI-0001',
  practitionerId: 'PRA-0001',
  authorisationId: 'AUT-0001',
  date: '2026-03-01',
  durationHours: 2,
  status: 'Completed',
  ...o,
});

/** A dataset that passes every rule; override any collection to break one. */
export const dataset = (o: Partial<Dataset> = {}): Dataset => ({
  clients: [client()],
  practitioners: [practitioner()],
  funders: [funder()],
  authorisations: [authorisation()],
  cases: [],
  bookings: [booking()],
  ...o,
});
