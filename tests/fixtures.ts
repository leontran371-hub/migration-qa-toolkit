// Typed fixtures. Each worker logs in once and every test in that worker reuses the saved session.
import fs from 'node:fs';
import path from 'node:path';
import { test as base } from '@playwright/test';
import { ApiClient } from './helpers/api';
import { TargetDb } from './helpers/db';
import { BookingListPage } from './pages/BookingListPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { ClientListPage } from './pages/ClientListPage';
import { LoginPage } from './pages/LoginPage';
import { targetDbPath, testUser } from './data';

interface TestFixtures {
  loginPage: LoginPage;
  clientListPage: ClientListPage;
  clientDetailPage: ClientDetailPage;
  bookingListPage: BookingListPage;
  api: ApiClient;
}

interface WorkerFixtures {
  workerStorageState: string;
  targetDb: TargetDb;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  storageState: ({ workerStorageState }, use) => use(workerStorageState),

  workerStorageState: [
    async ({ browser }, use, workerInfo) => {
      const file = path.resolve(workerInfo.project.outputDir, `.auth/worker-${workerInfo.parallelIndex}.json`);
      const context = await browser.newContext({ storageState: undefined, baseURL: workerInfo.project.use.baseURL });
      const loginPage = new LoginPage(await context.newPage());
      await loginPage.goto();
      await loginPage.login(testUser.username, testUser.password);
      await loginPage.page.waitForURL('**/clients');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      await context.storageState({ path: file });
      await context.close();
      await use(file);
    },
    { scope: 'worker' },
  ],

  targetDb: [
    async ({}, use) => {
      const db = new TargetDb(targetDbPath);
      await use(db);
      db.close();
    },
    { scope: 'worker' },
  ],

  loginPage: ({ page }, use) => use(new LoginPage(page)),
  clientListPage: ({ page }, use) => use(new ClientListPage(page)),
  clientDetailPage: ({ page }, use) => use(new ClientDetailPage(page)),
  bookingListPage: ({ page }, use) => use(new BookingListPage(page)),
  api: ({ page }, use) => use(new ApiClient(page.request)),
});

/** For tests that must start logged out (login, invalid login). */
export const loggedOut = { storageState: { cookies: [], origins: [] } };

export { expect } from '@playwright/test';
