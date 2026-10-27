// Shared domain types. Both systems reference each other by External ID.

/** ISO calendar date, YYYY-MM-DD. */
export type IsoDate = string;

export type ClientId = `CLI-${string}`;
export type PractitionerId = `PRA-${string}`;
export type FunderId = `FUN-${string}`;
export type AuthorisationId = `AUT-${string}`;
export type CaseId = `CAS-${string}`;
export type BookingId = `BKG-${string}`;

export interface Client {
  externalId: ClientId;
  firstName: string;
  lastName: string;
  dateOfBirth: IsoDate;
  status: 'Active' | 'Inactive';
}

export interface Practitioner {
  externalId: PractitionerId;
  firstName: string;
  lastName: string;
  activeFrom: IsoDate;
  /** Last active day; null while still active. */
  activeTo: IsoDate | null;
}

export interface Funder {
  externalId: FunderId;
  name: string;
}

export interface Authorisation {
  externalId: AuthorisationId;
  clientId: ClientId;
  funderId: FunderId;
  startDate: IsoDate;
  endDate: IsoDate;
  hoursApproved: number;
  hoursRemaining: number;
  status: 'Active' | 'Expired';
}

export interface Case {
  externalId: CaseId;
  clientId: ClientId;
  funderId: FunderId;
  openedDate: IsoDate;
  /** Null while the case is open. */
  closedDate: IsoDate | null;
  status: 'Open' | 'Closed';
}

export interface Booking {
  externalId: BookingId;
  clientId: ClientId;
  practitionerId: PractitionerId;
  /** Null only for seeded defect D3 (breaks R3). */
  authorisationId: AuthorisationId | null;
  date: IsoDate;
  durationHours: number;
  status: 'Scheduled' | 'Completed';
}
