import { test } from '../src/config/page.config';
import { users, loginExpected as expected } from '../src/config/page-loader';

test.describe('OrangeHRM - Login', () => {
  test('should login successfully and verify profile name on home page', async ({ loginPage, dashboardPage }) => {
    await loginPage.step_navigate();
    await loginPage.step_login(users.admin);
    await dashboardPage.verify_onDashboard();
    await dashboardPage.verify_profileName();
  });

  test('should show error message for invalid credentials', async ({ loginPage }) => {
    await loginPage.step_navigate();
    await loginPage.step_login(users.invalid);
    await loginPage.verify_errorMessage(expected.errors.invalidCredentials);
  });

});
