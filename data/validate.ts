// Checks the clean CSVs against R1-R5 (R1-R4 on the clean set, R5 clean vs itself). Exit 1 on any finding.
import { checkAll } from '../compare/rules';
import { TABLES, readDataset } from './csv';

const clean = readDataset('data/source');

for (const { key, object } of TABLES) console.log(`${object.padEnd(14)} ${clean[key].length}`);

const findings = checkAll(clean, clean);
for (const f of findings) console.log(JSON.stringify(f));

if (findings.length > 0) {
  console.log(`${findings.length} violation(s)`);
  process.exit(1);
}
console.log('0 violations');
