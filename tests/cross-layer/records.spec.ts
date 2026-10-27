// Cross-layer checks: one record per test, read through the UI, the API and the target DB,
// and compared with the clean Salesforce-side CSV where that adds meaning.
import type { Page } from '@playwright/test';
import type { Dataset } from '../../app/types';
import { bookedHours } from '../../compare/rules';
import { readDataset } from '../../data/csv';
import { defects } from '../data';
import { expect, test } from '../fixtures';

const clean: Dataset = readDataset('data/source');

/** First clean client not touched by any seeded defect (directly or through a defect authorisation). */
function untouchedClientId(): string {
  const touched = new Set<string>();
  for (const d of Object.values(defects)) {
    if ('clientId' in d) touched.add(d.clientId);
    if ('authorisationId' in d) {
      const auth = clean.authorisations.find((a) => a.externalId === d.authorisationId);
      if (auth) touched.add(auth.clientId);
    }
  }
  const client = clean.clients.find((c) => !touched.has(c.externalId));
  if (!client) throw new Error('No clean client untouched by the seeded defects');
  return client.externalId;
}

/** Text the UI shows for a value: null is rendered as "None". */
const uiText = (value: unknown): string => (value === null || value === undefined ? 'None' : String(value));

/** Opens a detail page and asserts every field of the record is shown as expected. */
async function expectDetailPage(page: Page, entity: 'client' | 'authorisation' | 'booking', record: object): Promise<void> {
  const id = (record as { externalId: string }).externalId;
  await page.goto(`/${entity}s/${encodeURIComponent(id)}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(new RegExp(`${id}$`));
  for (const [field, value] of Object.entries(record)) {
    await expect(page.getByTestId(`${entity}-field-${field}`), `UI field ${field}`).toHaveText(uiText(value));
  }
}

test.describe('Cross-layer: UI, API and DB agree on one record', () => {
  test('clean client matches across DB, API, UI and the Salesforce CSV', { tag: '@smoke' }, async ({ page, api, targetDb }) => {
    const id = untouchedClientId();
    const source = clean.clients.find((c) => c.externalId === id);

    const dbRow = targetDb.client(id);
    const apiRow = await api.getClient(id);

    expect(dbRow, 'DB row equals clean CSV').toEqual(source);
    expect(apiRow, 'API JSON equals DB row').toEqual(dbRow);
    await expectDetailPage(page, 'client', apiRow);
  });

  test('D5 client: DB, API and UI agree, and differ from the CSV lastName exactly as seeded', { tag: '@regression' }, async ({ page, api, targetDb }) => {
    const { clientId, field } = defects.D5;
    const source = clean.clients.find((c) => c.externalId === clientId);
    if (!source) throw new Error(`${clientId} missing from the clean CSV`);
    const expected = { ...source, [field]: source[field].slice(0, -1) };

    const dbRow = targetDb.client(clientId);
    const apiRow = await api.getClient(clientId);

    expect(dbRow, 'DB row has the truncated lastName, every other field clean').toEqual(expected);
    expect(dbRow?.[field], 'DB lastName differs from the CSV').not.toBe(source[field]);
    expect(apiRow, 'API JSON equals DB row').toEqual(dbRow);
    await expectDetailPage(page, 'client', apiRow);
    await expect(page.getByTestId(`client-field-${field}`)).not.toHaveText(source[field]);
  });

  test('D6 client: in the CSV, missing from DB, 404 from API, not-found page in UI', { tag: '@regression' }, async ({ page, api, targetDb }) => {
    const { clientId } = defects.D6;

    expect(clean.clients.some((c) => c.externalId === clientId), 'client exists in the clean CSV').toBe(true);
    expect(targetDb.client(clientId), 'client missing from the DB').toBeUndefined();

    const apiResponse = await api.get(`/api/clients/${encodeURIComponent(clientId)}`);
    expect(apiResponse.status(), 'API status').toBe(404);

    const uiResponse = await page.goto(`/clients/${encodeURIComponent(clientId)}`);
    expect(uiResponse?.status(), 'UI status').toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Not found');
    await expect(page.getByTestId('not-found')).toBeVisible();
  });

  test('D3 booking: no authorisation in DB, API and UI', { tag: '@regression' }, async ({ page, api, targetDb }) => {
    const { bookingId, clientId } = defects.D3;

    expect(clean.bookings.some((b) => b.externalId === bookingId), 'booking is target-only').toBe(false);

    const dbRow = targetDb.booking(bookingId);
    const apiRow = (await api.getBookings()).find((b) => b.externalId === bookingId);

    expect(dbRow, 'DB row exists').toBeDefined();
    expect(dbRow?.clientId).toBe(clientId);
    expect(dbRow?.authorisationId, 'DB authorisationId').toBeNull();
    expect(apiRow, 'API JSON equals DB row').toEqual(dbRow);
    expect(apiRow?.authorisationId, 'API authorisationId').toBeNull();

    await expectDetailPage(page, 'booking', dbRow!);
    const authField = page.getByTestId('booking-field-authorisationId');
    await expect(authField, 'UI authorisation').toHaveText('None');
    await expect(authField.getByRole('link'), 'no authorisation link').toHaveCount(0);
  });

  test('D2 authorisation: DB, API and UI agree, and booked hours exceed hours approved', { tag: '@regression' }, async ({ page, api, targetDb }) => {
    const { authorisationId, bookingIds } = defects.D2;
    const source = clean.authorisations.find((a) => a.externalId === authorisationId);

    const dbRow = targetDb.authorisation(authorisationId);
    const apiRow = (await api.getAuthorisations()).find((a) => a.externalId === authorisationId);

    expect(dbRow, 'DB row equals clean CSV (authorisations are never changed)').toEqual(source);
    expect(apiRow, 'API JSON equals DB row').toEqual(dbRow);
    await expectDetailPage(page, 'authorisation', dbRow!);

    const cleanBooked = bookedHours(clean.bookings).get(authorisationId) ?? 0;
    const dbBooked = targetDb.bookedHours(authorisationId);
    const apiBooked = bookedHours(await api.getBookings()).get(authorisationId) ?? 0;

    expect(cleanBooked, 'clean CSV is within hours approved').toBeLessThanOrEqual(dbRow!.hoursApproved);
    expect(apiBooked, 'API booked hours equal DB booked hours').toBe(dbBooked);
    expect(dbBooked, 'DB booked hours exceed hours approved').toBeGreaterThan(dbRow!.hoursApproved);
    expect(targetDb.bookingsForAuthorisation(authorisationId).map((b) => b.externalId)).toEqual(expect.arrayContaining([...bookingIds]));
  });
});
