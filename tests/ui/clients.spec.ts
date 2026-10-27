import { expect, test } from '../fixtures';
import { defects } from '../data';
import { readDataset } from '../../data/csv';
import type { Client } from '../../app/types';

const source = readDataset('data/source');

/** Client IDs touched by a seeded defect; every other client is identical in both systems. */
const defectClientIds = new Set<string>(
  Object.values(defects).flatMap((d) => ('clientId' in d ? [d.clientId] : [])),
);
const cleanClients = source.clients.filter((c) => !defectClientIds.has(c.externalId));

const fullName = (c: Client) => `${c.firstName} ${c.lastName}`;
const searchable = (c: Client) => [c.externalId, c.firstName, c.lastName, fullName(c)].map((s) => s.toLowerCase());

/** First clean client whose full name matches no other client, so a search for it has exactly one result. */
const uniqueClient = cleanClients.find((c) => {
  const query = fullName(c).toLowerCase();
  return source.clients.every((other) => other === c || !searchable(other).some((s) => s.includes(query)));
});

const sourceClient = (id: string) => {
  const client = source.clients.find((c) => c.externalId === id);
  if (!client) throw new Error(`${id} not in data/source/clients.csv`);
  return client;
};

const clientFields = Object.keys(source.clients[0]) as (keyof Client)[];

test.describe('client search', () => {
  test('a matching query narrows the list to that client', { tag: '@regression' }, async ({ clientListPage }) => {
    if (!uniqueClient) throw new Error('No clean client with a unique name in the source data');

    await clientListPage.goto();
    await clientListPage.search(fullName(uniqueClient));

    await expect(clientListPage.rows).toHaveCount(1);
    await expect(clientListPage.row(uniqueClient.externalId)).toBeVisible();
    await expect(clientListPage.searchInput).toHaveValue(fullName(uniqueClient));
  });

  test('a query with no match shows the empty state', { tag: '@regression' }, async ({ clientListPage }) => {
    await clientListPage.goto();
    await clientListPage.search('no-such-client-xyz');

    await expect(clientListPage.emptyState).toBeVisible();
    await expect(clientListPage.table).toHaveCount(0);
  });
});

test.describe('client detail', () => {
  test('every field of a clean client matches the clean CSV', { tag: '@regression' }, async ({ clientListPage, clientDetailPage, page }) => {
    const client = cleanClients[0];

    await clientListPage.goto();
    await clientListPage.openClient(client.externalId);

    await expect(page).toHaveURL(new RegExp(`/clients/${client.externalId}$`));
    await expect(clientDetailPage.heading).toContainText(client.externalId);
    for (const field of clientFields) {
      await expect(clientDetailPage.field(field), field).toHaveText(String(client[field]));
    }
  });

  test('D5 client shows the renamed last name, not the Salesforce value', { tag: '@regression' }, async ({ clientDetailPage }) => {
    const { clientId, field } = defects.D5;
    const original = sourceClient(clientId);

    await clientDetailPage.goto(clientId);

    await expect(clientDetailPage.field(field)).toBeVisible();
    await expect(clientDetailPage.field(field)).not.toHaveText(original[field]);
    await expect(clientDetailPage.field(field)).not.toBeEmpty();
    // Only the defective field drifted; the rest of the record still matches.
    for (const other of clientFields.filter((f) => f !== field)) {
      await expect(clientDetailPage.field(other), other).toHaveText(String(original[other]));
    }
  });
});
