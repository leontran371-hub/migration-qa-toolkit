// The API refuses every endpoint without a session. Uses the request fixture with empty storage state (no cookies).
import { readDataset } from '../../data/csv';
import { expect, loggedOut, test } from '../fixtures';

const anyClientId = readDataset('data/source').clients[0].externalId;

const endpoints = ['/api/clients', `/api/clients/${anyClientId}`, '/api/authorisations', '/api/bookings'];

test.describe('Cross-layer: API requires a session', () => {
  test.use(loggedOut);

  for (const endpoint of endpoints) {
    test(`GET ${endpoint} returns 401 without a session`, { tag: '@smoke' }, async ({ request }) => {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    });
  }
});
