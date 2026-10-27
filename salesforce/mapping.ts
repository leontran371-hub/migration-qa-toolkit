// Domain field <-> Salesforce field mapping, shared by load, export and reset.
import type { Dataset, ObjectName } from '../app/types';

export type SfField =
  | { kind: 'text'; api: string; length: number }
  | { kind: 'date'; api: string }
  | { kind: 'number'; api: string }
  | { kind: 'picklist'; api: string; values: string[] }
  /** Lookup to another object, loaded and exported via the parent's External_Id__c. */
  | { kind: 'lookup'; api: string; parent: string; relationshipName: string };

export interface SfObject {
  key: keyof Dataset;
  object: ObjectName;
  sobject: string;
  label: string;
  pluralLabel: string;
  /** Domain field that holds the record's Name; externalId when the object has no natural name. */
  nameFrom: (row: Record<string, unknown>) => string;
  /** Every domain field except externalId, which always maps to External_Id__c. */
  fields: Record<string, SfField>;
}

const text = (api: string, length = 80): SfField => ({ kind: 'text', api, length });
const date = (api: string): SfField => ({ kind: 'date', api });
const hours = (api: string): SfField => ({ kind: 'number', api });
const picklist = (api: string, values: string[]): SfField => ({ kind: 'picklist', api, values });
const lookup = (api: string, parent: string, relationshipName: string): SfField => ({
  kind: 'lookup',
  api,
  parent,
  relationshipName,
});

const fullName = (row: Record<string, unknown>) => `${row.firstName} ${row.lastName}`;
const byExternalId = (row: Record<string, unknown>) => String(row.externalId);

/** Dependency (load) order; reset runs it in reverse. */
export const SF_OBJECTS: readonly SfObject[] = [
  {
    key: 'funders',
    object: 'Funder',
    sobject: 'Funder__c',
    label: 'Funder',
    pluralLabel: 'Funders',
    nameFrom: (row) => String(row.name),
    fields: { name: text('Funder_Name__c') },
  },
  {
    key: 'clients',
    object: 'Client',
    sobject: 'Client__c',
    label: 'Client',
    pluralLabel: 'Clients',
    nameFrom: fullName,
    fields: {
      firstName: text('First_Name__c'),
      lastName: text('Last_Name__c'),
      dateOfBirth: date('Date_of_Birth__c'),
      status: picklist('Status__c', ['Active', 'Inactive']),
    },
  },
  {
    key: 'practitioners',
    object: 'Practitioner',
    sobject: 'Practitioner__c',
    label: 'Practitioner',
    pluralLabel: 'Practitioners',
    nameFrom: fullName,
    fields: {
      firstName: text('First_Name__c'),
      lastName: text('Last_Name__c'),
      activeFrom: date('Active_From__c'),
      activeTo: date('Active_To__c'),
    },
  },
  {
    key: 'authorisations',
    object: 'Authorisation',
    sobject: 'Authorisation__c',
    label: 'Authorisation',
    pluralLabel: 'Authorisations',
    nameFrom: byExternalId,
    fields: {
      clientId: lookup('Client__c', 'Client__c', 'Authorisations'),
      funderId: lookup('Funder__c', 'Funder__c', 'Authorisations'),
      startDate: date('Start_Date__c'),
      endDate: date('End_Date__c'),
      hoursApproved: hours('Hours_Approved__c'),
      hoursRemaining: hours('Hours_Remaining__c'),
      status: picklist('Status__c', ['Active', 'Expired']),
    },
  },
  {
    key: 'cases',
    object: 'Case',
    sobject: 'Case__c',
    label: 'Service Case',
    pluralLabel: 'Service Cases',
    nameFrom: byExternalId,
    fields: {
      clientId: lookup('Client__c', 'Client__c', 'Service_Cases'),
      funderId: lookup('Funder__c', 'Funder__c', 'Service_Cases'),
      openedDate: date('Opened_Date__c'),
      closedDate: date('Closed_Date__c'),
      status: picklist('Status__c', ['Open', 'Closed']),
    },
  },
  {
    key: 'bookings',
    object: 'Booking',
    sobject: 'Booking__c',
    label: 'Booking',
    pluralLabel: 'Bookings',
    nameFrom: byExternalId,
    fields: {
      clientId: lookup('Client__c', 'Client__c', 'Bookings'),
      practitionerId: lookup('Practitioner__c', 'Practitioner__c', 'Bookings'),
      authorisationId: lookup('Authorisation__c', 'Authorisation__c', 'Bookings'),
      date: date('Booking_Date__c'),
      durationHours: hours('Duration_Hours__c'),
      status: picklist('Status__c', ['Scheduled', 'Completed']),
    },
  },
];

/** Column name used in load CSVs and SOQL for a mapped field. */
export function sfColumn(field: SfField): string {
  return field.kind === 'lookup' ? `${field.api.replace(/__c$/, '__r')}.External_Id__c` : field.api;
}
