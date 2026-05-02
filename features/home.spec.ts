import { test } from '../src/config/page.config';
import { users, dashboardExpected as expected } from '../src/config/page-loader';

test.describe('OrangeHRM - Home (Dashboard)', () => {
  test('should display dashboard home page with profile visible after authenticated session', async ({ loginPage, dashboardPage }) => {
    await loginPage.step_navigate();
    await loginPage.step_login(users.admin);
    await dashboardPage.verify_onDashboard();
    await dashboardPage.verify_pageTitle(expected.labels.pageTitle);
    await dashboardPage.verify_profileName();
  });

});
