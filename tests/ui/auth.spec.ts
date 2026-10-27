import { expect, loggedOut, test } from '../fixtures';
import { testUser } from '../data';
import { AppHeader } from '../pages/AppHeader';

test.describe('sign in', () => {
  test.use(loggedOut);

  test('valid login lands on the client list and shows the current user', { tag: '@smoke' }, async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.login(testUser.username, testUser.password);

    await expect(page).toHaveURL(/\/clients$/);
    await expect(new AppHeader(page).currentUser).toHaveText(testUser.username);
  });

  test('invalid login shows an error and stays on the sign-in page', { tag: '@smoke' }, async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.login(testUser.username, `${testUser.password}-wrong`);

    await expect(loginPage.error).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await expect(new AppHeader(page).currentUser).toHaveCount(0);
  });
});

test.describe('sign out', () => {
  test('logout returns to sign-in and protected pages redirect there', { tag: '@smoke' }, async ({ clientListPage, page }) => {
    await clientListPage.goto();
    await expect(clientListPage.header.currentUser).toHaveText(testUser.username);

    await clientListPage.header.logout();
    await expect(page).toHaveURL(/\/login$/);

    await clientListPage.goto();
    await expect(page).toHaveURL(/\/login$/);
  });
});
