// Builds a fresh target DB: schema, clean CSVs, then the seeded defects.
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { env } from '../app/env';
import { TABLES, readDataset } from '../data/csv';
import { applyDefects, insertRows } from '../data/defects';

fs.rmSync(env.dbPath, { force: true });
const db = new Database(env.dbPath);
db.exec(fs.readFileSync('db/schema.sql', 'utf8'));

const clean = readDataset('data/source');
db.transaction(() => {
  for (const spec of TABLES) insertRows(db, spec, clean[spec.key]);
})();
applyDefects(db);

for (const { key } of TABLES) {
  const { n } = db.prepare(`SELECT COUNT(*) AS n FROM ${key}`).get() as { n: number };
  console.log(`${key.padEnd(15)} ${n}`);
}
db.close();
