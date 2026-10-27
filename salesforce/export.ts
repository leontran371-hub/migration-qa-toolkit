// Queries every object back out of Salesforce into /data/sf-export/<object>.json, typed like /app/types.ts.
import fs from 'node:fs';
import path from 'node:path';
import { readDataset } from '../data/csv';
import { SF_OBJECTS, sfColumn, type SfField } from './mapping';
import { query } from './sf';

const EXPORT_DIR = 'data/sf-export';
const csvCounts = readDataset('data/source');
fs.mkdirSync(EXPORT_DIR, { recursive: true });

type SfRecord = Record<string, unknown>;

function readField(record: SfRecord, f: SfField): string | number | null {
  const value = f.kind === 'lookup' ? (record[f.api.replace(/__c$/, '__r')] as SfRecord | null)?.External_Id__c : record[f.api];
  if (value === null || value === undefined) return null;
  return f.kind === 'number' ? Number(value) : String(value);
}

for (const o of SF_OBJECTS) {
  const columns = ['External_Id__c', ...Object.values(o.fields).map(sfColumn)];
  const records = query<SfRecord>(`SELECT ${columns.join(', ')} FROM ${o.sobject} ORDER BY External_Id__c`);
  const rows = records.map((record) => ({
    externalId: record.External_Id__c,
    ...Object.fromEntries(Object.entries(o.fields).map(([field, f]) => [field, readField(record, f)])),
  }));
  fs.writeFileSync(path.join(EXPORT_DIR, `${o.key}.json`), JSON.stringify(rows, null, 2) + '\n');
  console.log(`${o.sobject.padEnd(18)} exported ${String(rows.length).padStart(3)}  csv ${csvCounts[o.key].length}`);
}
