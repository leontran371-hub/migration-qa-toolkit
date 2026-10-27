import type { Locator, Page } from '@playwright/test';

/** Shared header shown on every signed-in page: main navigation, current user and sign-out. */
export class AppHeader {
  readonly currentUser: Locator;
  readonly logoutButton: Locator;
  readonly navClients: Locator;
  readonly navAuthorisations: Locator;
  readonly navBookings: Locator;

  constructor(readonly page: Page) {
    this.currentUser = page.getByTestId('current-user');
    this.logoutButton = page.getByRole('button', { name: 'Sign out' });
    this.navClients = page.getByTestId('nav-clients');
    this.navAuthorisations = page.getByTestId('nav-authorisations');
    this.navBookings = page.getByTestId('nav-bookings');
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
