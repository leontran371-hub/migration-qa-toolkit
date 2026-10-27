// Deletes every migration record from Salesforce, children before parents, so the load can be repeated.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SF_OBJECTS } from './mapping';
import { count, sf } from './sf';

const reverse = [...SF_OBJECTS].reverse();
const apex = reverse.map((o) => `delete [SELECT Id FROM ${o.sobject}];`).join('\n');
const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sf-reset-')), 'reset.apex');
fs.writeFileSync(file, apex + '\n');

const result = sf<{ success: boolean; compileProblem?: string; exceptionMessage?: string }>(['apex', 'run', '--file', file]);
if (!result.success) throw new Error(result.compileProblem || result.exceptionMessage || 'Apex reset failed');
for (const o of reverse) console.log(`${o.sobject.padEnd(18)} remaining ${count(o.sobject)}`);
