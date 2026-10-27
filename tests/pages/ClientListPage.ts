import type { Locator, Page } from '@playwright/test';
import type { ClientId } from '../../app/types';
import { AppHeader } from './AppHeader';

export class ClientListPage {
  readonly header: AppHeader;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly table: Locator;
  /** Body rows only (each carries data-testid client-row-<id>). */
  readonly rows: Locator;
  readonly emptyState: Locator;

  constructor(readonly page: Page) {
    this.header = new AppHeader(page);
    this.heading = page.getByTestId('page-heading');
    this.searchInput = page.getByLabel('Search clients');
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.table = page.getByTestId('client-table');
    this.rows = this.table.getByTestId(/^client-row-/);
    this.emptyState = page.getByTestId('empty-state');
  }

  async goto(): Promise<void> {
    await this.page.goto('/clients');
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.searchButton.click();
  }

  row(externalId: ClientId): Locator {
    return this.table.getByTestId(`client-row-${externalId}`);
  }

  async openClient(externalId: ClientId): Promise<void> {
    await this.row(externalId).getByTestId(`client-link-${externalId}`).click();
  }
}
