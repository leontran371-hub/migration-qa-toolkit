// Loads the clean CSVs into Salesforce with Bulk API 2.0, parents before children.
import fs from 'node:fs';
import path from 'node:path';
import { readDataset, toCsv } from '../data/csv';
import { SF_OBJECTS, sfColumn } from './mapping';
import { count, sf } from './sf';

const LOAD_DIR = path.resolve('data/sf-load');
const clean = readDataset('data/source');
fs.mkdirSync(LOAD_DIR, { recursive: true });

for (const o of SF_OBJECTS) {
  const rows = clean[o.key] as unknown as Record<string, unknown>[];
  const columns = ['External_Id__c', 'Name', ...Object.values(o.fields).map(sfColumn)];
  const sfRows = rows.map((row) => ({
    External_Id__c: row.externalId,
    Name: o.nameFrom(row),
    ...Object.fromEntries(Object.entries(o.fields).map(([field, f]) => [sfColumn(f), row[field]])),
  }));
  const file = path.join(LOAD_DIR, `${o.key}.csv`);
  fs.writeFileSync(file, toCsv(columns, sfRows));

  const result = sf<{ processedRecords: number; failedRecords: number }>([
    'data', 'import', 'bulk', '--sobject', o.sobject, '--file', file, '--line-ending', 'LF', '--wait', '10',
  ]);
  if (result.failedRecords > 0) throw new Error(`${o.sobject}: ${result.failedRecords} records failed`);
  console.log(`${o.sobject.padEnd(18)} loaded ${String(result.processedRecords).padStart(3)}  org count ${count(o.sobject)}`);
}
