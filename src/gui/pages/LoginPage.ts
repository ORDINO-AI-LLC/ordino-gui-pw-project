import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { LoginCredentials } from '@data/interfaces';
import { logField, logSep, step } from '@config/utils/decorators';

export class LoginPage extends BasePage {
  readonly path = '/web/index.php/auth/login';

  private usernameInput = this.page.locator('input[name="username"]');
  private passwordInput = this.page.locator('input[name="password"]');
  private loginButton   = this.page.locator('button[type="submit"]');
  private errorMessage  = this.page.locator('.oxd-alert-content-text');

  constructor(page: Page) {
    super(page);
  }

  @step
  async step_navigate(): Promise<this> {
    await this.page.goto(this.path);
    await this.waitForPageLoad();
    return this;
  }

  @step
  async step_login(credentials: LoginCredentials): Promise<this> {
    await this.usernameInput.fill(credentials.username);
    await this.passwordInput.fill(credentials.password);
    await this.loginButton.click();
    await this.waitForPageLoad();
    return this;
  }

  @step
  async verify_errorMessage(expectedText: string): Promise<this> {
    await this.errorMessage.waitFor({ state: 'visible' });
    const actual = await this.errorMessage.innerText();
    expect(actual.trim()).toContain(expectedText);
    return this;
  }
}
