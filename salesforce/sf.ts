// Thin wrapper around the Salesforce CLI. Always targets env.sfOrgAlias, never the CLI default org.
import { execFileSync } from 'node:child_process';
import { env } from '../app/env';

export const SF_DIR = 'salesforce';

export function sf<T = unknown>(args: string[]): T {
  let out: string;
  try {
    out = execFileSync('sf', [...args, '--target-org', env.sfOrgAlias, '--json'], {
      cwd: SF_DIR,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    out = (error as { stdout?: string }).stdout ?? '';
    if (!out) throw error;
  }
  const parsed = JSON.parse(out) as { status: number; result: T; message?: string };
  if (parsed.status !== 0) {
    const failures = (parsed.result as { files?: { state: string; fullName: string; error?: string }[] })?.files
      ?.filter((f) => f.state === 'Failed')
      .map((f) => `  ${f.fullName}: ${f.error}`);
    throw new Error([`sf ${args.slice(0, 3).join(' ')} failed: ${parsed.message ?? ''}`, ...(failures ?? [])].join('\n'));
  }
  return parsed.result;
}

export function query<T>(soql: string): T[] {
  return sf<{ records: T[] }>(['data', 'query', '--query', soql]).records;
}

export function count(sobject: string): number {
  return sf<{ totalSize: number }>(['data', 'query', '--query', `SELECT COUNT() FROM ${sobject}`]).totalSize;
}
