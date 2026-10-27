import { expect, test } from '../fixtures';
import { defects } from '../data';
import { readDataset } from '../../data/csv';

const source = readDataset('data/source');

const sourceAuthorisation = (id: string) => {
  const auth = source.authorisations.find((a) => a.externalId === id);
  if (!auth) throw new Error(`${id} not in data/source/authorisations.csv`);
  return auth;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

test.describe('defective bookings in the target', () => {
  test.beforeEach(async ({ bookingListPage }) => {
    await bookingListPage.goto();
  });

  test('D1 booking is dated after its authorisation ends', { tag: '@regression' }, async ({ bookingListPage }) => {
    const { bookingId, authorisationId } = defects.D1;
    const auth = sourceAuthorisation(authorisationId);

    await expect(bookingListPage.cell(bookingId, 'authorisationId')).toHaveText(authorisationId);
    const dateCell = bookingListPage.cell(bookingId, 'date');
    await expect(dateCell).toHaveText(ISO_DATE);
    const date = await dateCell.innerText();
    expect(date > auth.endDate, `booking date ${date} should be after authorisation end ${auth.endDate}`).toBe(true);
  });

  test('D3 booking shows "None" for its authorisation', { tag: '@regression' }, async ({ bookingListPage, page }) => {
    const { bookingId, clientId } = defects.D3;

    await expect(bookingListPage.cell(bookingId, 'clientId')).toHaveText(clientId);
    await expect(bookingListPage.cell(bookingId, 'authorisationId')).toHaveText('None');

    await bookingListPage.openBooking(bookingId);
    await expect(page).toHaveURL(new RegExp(`/bookings/${bookingId}$`));
    await expect(bookingListPage.detailField('authorisationId')).toHaveText('None');
  });

  test('D4 booking uses the practitioner after their last active day', { tag: '@regression' }, async ({ bookingListPage }) => {
    const { bookingId, authorisationId, practitionerId } = defects.D4;
    const practitioner = source.practitioners.find((p) => p.externalId === practitionerId);
    if (!practitioner?.activeTo) throw new Error(`${practitionerId} should have an activeTo date in the source data`);

    await expect(bookingListPage.cell(bookingId, 'practitionerId')).toHaveText(practitionerId);
    await expect(bookingListPage.cell(bookingId, 'authorisationId')).toHaveText(authorisationId);
    const dateCell = bookingListPage.cell(bookingId, 'date');
    await expect(dateCell).toHaveText(ISO_DATE);
    const date = await dateCell.innerText();
    expect(date > practitioner.activeTo, `booking date ${date} should be after ${practitionerId} activeTo ${practitioner.activeTo}`).toBe(true);
  });

  test('D2 adds three bookings that over-book one authorisation', { tag: '@regression' }, async ({ bookingListPage, page }) => {
    const { bookingIds, authorisationId } = defects.D2;
    const auth = sourceAuthorisation(authorisationId);

    for (const id of bookingIds) {
      await expect(bookingListPage.cell(id, 'authorisationId')).toHaveText(authorisationId);
    }

    // Every target booking on this authorisation: the clean ones plus the three D2 bookings.
    const cleanCount = source.bookings.filter((b) => b.authorisationId === authorisationId).length;
    const onAuth = bookingListPage.rows.filter({
      has: page.getByTestId('booking-cell-authorisationId').filter({ hasText: new RegExp(`^\\s*${authorisationId}\\s*$`) }),
    });
    await expect(onAuth).toHaveCount(cleanCount + bookingIds.length);

    const hours = (await onAuth.getByTestId('booking-cell-durationHours').allInnerTexts()).map(Number);
    const booked = hours.reduce((sum, h) => sum + h, 0);
    expect(booked, `booked hours on ${authorisationId}`).toBeGreaterThan(auth.hoursApproved);
  });
});
