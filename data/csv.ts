// Minimal CSV read/write for the clean dataset. No dependency.
import fs from 'node:fs';
import path from 'node:path';
import type {
  Authorisation,
  Booking,
  Case,
  Client,
  Dataset,
  Funder,
  ObjectName,
  Practitioner,
} from '../app/types';

type Row = Record<string, string | number | null>;

/** Field list in interface order; the Record type forces every field of T to be listed. */
function fieldsOf<T>(fields: Record<keyof T, true>): (keyof T & string)[] {
  return Object.keys(fields) as (keyof T & string)[];
}

export interface TableSpec {
  key: keyof Dataset;
  object: ObjectName;
  fields: string[];
}

/** Every table, in dependency (insert) order. Dataset key = CSV base name = SQLite table name. */
export const TABLES: readonly TableSpec[] = [
  { key: 'funders', object: 'Funder', fields: fieldsOf<Funder>({ externalId: true, name: true }) },
  {
    key: 'clients',
    object: 'Client',
    fields: fieldsOf<Client>({ externalId: true, firstName: true, lastName: true, dateOfBirth: true, status: true }),
  },
  {
    key: 'practitioners',
    object: 'Practitioner',
    fields: fieldsOf<Practitioner>({ externalId: true, firstName: true, lastName: true, activeFrom: true, activeTo: true }),
  },
  {
    key: 'authorisations',
    object: 'Authorisation',
    fields: fieldsOf<Authorisation>({
      externalId: true,
      clientId: true,
      funderId: true,
      startDate: true,
      endDate: true,
      hoursApproved: true,
      hoursRemaining: true,
      status: true,
    }),
  },
  {
    key: 'cases',
    object: 'Case',
    fields: fieldsOf<Case>({ externalId: true, clientId: true, funderId: true, openedDate: true, closedDate: true, status: true }),
  },
  {
    key: 'bookings',
    object: 'Booking',
    fields: fieldsOf<Booking>({
      externalId: true,
      clientId: true,
      practitionerId: true,
      authorisationId: true,
      date: true,
      durationHours: true,
      status: true,
    }),
  },
];

const NULLABLE_FIELDS = new Set(['activeTo', 'closedDate', 'authorisationId']);
const NUMERIC_FIELDS = new Set(['hoursApproved', 'hoursRemaining', 'durationHours']);

function quote(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function toCsv(fields: string[], rows: readonly object[]): string {
  const lines = [fields.join(',')];
  for (const row of rows) {
    const record = row as Row;
    lines.push(fields.map((f) => quote(record[f] === null ? '' : String(record[f]))).join(','));
  }
  return lines.join('\n') + '\n';
}

/** Splits CSV text into records of raw string cells (handles quotes, escaped quotes, embedded newlines). */
function parseCells(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      record.push(cell);
      cell = '';
    } else if (ch === '\n') {
      record.push(cell);
      records.push(record);
      record = [];
      cell = '';
    } else if (ch !== '\r') cell += ch;
  }
  if (cell !== '' || record.length > 0) {
    record.push(cell);
    records.push(record);
  }
  return records;
}

function typedValue(field: string, raw: string): string | number | null {
  if (raw === '' && NULLABLE_FIELDS.has(field)) return null;
  return NUMERIC_FIELDS.has(field) ? Number(raw) : raw;
}

export function fromCsv(text: string): Row[] {
  const [header, ...records] = parseCells(text);
  return records.map((cells) => Object.fromEntries(header.map((f, i) => [f, typedValue(f, cells[i] ?? '')])));
}

const fileOf = (dir: string, spec: TableSpec) => path.join(dir, `${spec.key}.csv`);

export function writeDataset(dir: string, ds: Dataset): void {
  fs.mkdirSync(dir, { recursive: true });
  for (const spec of TABLES) fs.writeFileSync(fileOf(dir, spec), toCsv(spec.fields, ds[spec.key]));
}

export function readDataset(dir: string): Dataset {
  const entries = TABLES.map((spec) => [spec.key, fromCsv(fs.readFileSync(fileOf(dir, spec), 'utf8'))]);
  return Object.fromEntries(entries) as unknown as Dataset;
}
