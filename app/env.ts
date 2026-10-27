import fs from 'node:fs';
import dotenv from 'dotenv';

// .env wins; .env.example supplies the test-only defaults on a clean clone.
dotenv.config({ path: '.env', quiet: true });
if (fs.existsSync('.env.example')) dotenv.config({ path: '.env.example', quiet: true });

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env`);
  return value;
}

export const env = {
  referenceDate: process.env.REFERENCE_DATE ?? '2026-11-01',
  dbPath: process.env.DB_PATH ?? 'db/target.db',
  port: Number(process.env.PORT ?? 3000),
  appUsername: required('APP_USERNAME'),
  appPassword: required('APP_PASSWORD'),
  sessionSecret: required('SESSION_SECRET'),
};
