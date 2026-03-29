import { test } from '../src/config/page.config';
import { CredentialResolver, DataLoader, LoginExpectedFile, logSuite, logTest } from '../src/config/page-loader';

const expected = DataLoader.load<LoginExpectedFile>('login/expected');

// Clear any saved auth state for these tests — we explicitly test the login flow
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('OrangeHRM - Login', () => {
  logSuite('OrangeHRM - Login');

  test('should login successfully and verify profile name on home page', async ({ loginPage, dashboardPage }) => {
    logTest('should login successfully and verify profile name on home page');
    await loginPage.step_navigate();
    await loginPage.step_login(CredentialResolver.getUser('admin'));
    await dashboardPage.verify_onDashboard();
    await dashboardPage.verify_profileName();
  });

  test('should show error message for invalid credentials', async ({ loginPage }) => {
    logTest('should show error message for invalid credentials');
    await loginPage.step_navigate();
    await loginPage.step_login(CredentialResolver.getUser('invalid'));
    await loginPage.verify_errorMessage(expected.errors.invalidCredentials);
  });

});
