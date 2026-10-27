import type { Locator, Page } from '@playwright/test';
import type { Client, ClientId } from '../../app/types';
import { AppHeader } from './AppHeader';

export class ClientDetailPage {
  readonly header: AppHeader;
  readonly heading: Locator;
  readonly details: Locator;

  constructor(readonly page: Page) {
    this.header = new AppHeader(page);
    this.heading = page.getByTestId('page-heading');
    this.details = page.getByTestId('client-detail');
  }

  async goto(externalId: ClientId): Promise<void> {
    await this.page.goto(`/clients/${encodeURIComponent(externalId)}`);
  }

  field(name: keyof Client): Locator {
    return this.details.getByTestId(`client-field-${name}`);
  }
}
