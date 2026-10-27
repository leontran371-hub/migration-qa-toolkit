// npm run compare [-- --source <dir>] [--known <file>]
// Reads the Salesforce export and the target DB, writes /reports/compare.{json,html}, exits 1 on any FAILED finding.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import Database from 'better-sqlite3';
import type { Dataset } from '../app/types';
import { env } from '../app/env';
import { TABLES } from '../data/csv';
import { readDatasetFromDb } from '../data/defects';
import { compare, type KnownDefect } from './engine';
import { renderHtml } from './report';

const REPORT_DIR = 'reports';

const { values } = parseArgs({
  options: {
    source: { type: 'string', default: 'data/sf-export' },
    known: { type: 'string' },
  },
});

function readExport(dir: string): Dataset {
  const entries = TABLES.map((t) => [t.key, JSON.parse(fs.readFileSync(path.join(dir, `${t.key}.json`), 'utf8'))]);
  return Object.fromEntries(entries) as Dataset;
}

const source = readExport(values.source);
const db = new Database(env.dbPath, { readonly: true, fileMustExist: true });
const target = readDatasetFromDb(db);
db.close();
const known: KnownDefect[] = values.known ? JSON.parse(fs.readFileSync(values.known, 'utf8')) : [];

const result = compare(source, target, known, env.referenceDate);
fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(path.join(REPORT_DIR, 'compare.json'), JSON.stringify(result, null, 2) + '\n');
fs.writeFileSync(path.join(REPORT_DIR, 'compare.html'), renderHtml(result));

const { summary } = result;
for (const f of result.findings) {
  console.log(`${f.status.padEnd(6)} ${(f.defect ?? '').padEnd(3)} ${f.rule} ${f.object.padEnd(13)} ${f.externalId} ${f.field ?? ''} expected=${f.expected} actual=${f.actual}`);
}
console.log(`checked ${summary.totalChecked}  passed ${summary.passed}  failed ${summary.failed}  known ${summary.known}`);
console.log(`Reports: ${REPORT_DIR}/compare.html, ${REPORT_DIR}/compare.json`);
process.exit(summary.failed > 0 ? 1 : 0);
