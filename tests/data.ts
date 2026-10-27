// Shared, typed test data. Defect IDs come from the seeder so tests never drift from the seeded data.
import { env } from '../app/env';
import { SEEDED_DEFECTS } from '../data/defects';

export const testUser = { username: env.appUsername, password: env.appPassword } as const;
export const targetDbPath = env.dbPath;
export const defects = SEEDED_DEFECTS;
