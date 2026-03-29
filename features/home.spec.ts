import { test } from '../src/config/page.config';
import { DataLoader, DashboardExpectedFile, DashboardPage, logSuite, logTest } from '../src/config/page-loader';

const expected = DataLoader.load<DashboardExpectedFile>('dashboard/expected');

test.describe('OrangeHRM - Home (Dashboard)', () => {
  logSuite('OrangeHRM - Home');

  test('should display dashboard home page with profile visible after authenticated session', async ({ authenticatedPage }) => {
    logTest('should display dashboard home page with profile visible after authenticated session');
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.step_navigate();
    await dashboard.verify_onDashboard();
    await dashboard.verify_pageTitle(expected.labels.pageTitle);
    await dashboard.verify_profileName();
  });

});
