import type { Locator, Page } from '@playwright/test';
import type { Booking, BookingId } from '../../app/types';
import { AppHeader } from './AppHeader';

/** Booking list (/bookings) plus the booking detail page it links to. */
export class BookingListPage {
  readonly header: AppHeader;
  readonly heading: Locator;
  readonly table: Locator;
  /** Body rows only (each carries data-testid booking-row-<id>). */
  readonly rows: Locator;
  readonly details: Locator;

  constructor(readonly page: Page) {
    this.header = new AppHeader(page);
    this.heading = page.getByTestId('page-heading');
    this.table = page.getByTestId('booking-table');
    this.rows = this.table.getByTestId(/^booking-row-/);
    this.details = page.getByTestId('booking-detail');
  }

  async goto(): Promise<void> {
    await this.page.goto('/bookings');
  }

  row(externalId: BookingId): Locator {
    return this.table.getByTestId(`booking-row-${externalId}`);
  }

  cell(externalId: BookingId, field: keyof Booking): Locator {
    return this.row(externalId).getByTestId(`booking-cell-${field}`);
  }

  async openBooking(externalId: BookingId): Promise<void> {
    await this.row(externalId).getByTestId(`booking-link-${externalId}`).click();
  }

  /** A field on the booking detail page (after openBooking). */
  detailField(field: keyof Booking): Locator {
    return this.details.getByTestId(`booking-field-${field}`);
  }
}
