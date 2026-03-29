import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { HeaderPanel } from '@gui/panels/HeaderPanel';
import { logField, logUrl, logSep, step } from '@config/utils/decorators';

export class DashboardPage extends BasePage {
  readonly path = '/web/index.php/dashboard/index';
  readonly topNav: HeaderPanel;

  constructor(page: Page) {
    super(page);
    this.topNav = new HeaderPanel(page);
  }

  @step
  async step_navigate(): Promise<this> {
    await this.page.goto(this.path);
    await this.page.waitForURL(/dashboard/, { timeout: 15000 });
    await this.waitForPageLoad();
    return this;
  }

  @step
  async verify_onDashboard(): Promise<this> {
    await expect(this.page).toHaveURL(/dashboard/);
    return this;
  }

  @step
  async verify_pageTitle(expectedTitle: string): Promise<this> {
    const title = await this.getTitle();
    expect(title).toContain(expectedTitle);
    return this;
  }

  @step
  async verify_profileName(): Promise<this> {
    const name  = await this.topNav.getProfileName();
    const title = await this.getTitle();
    expect(name.length).toBeGreaterThan(0);
    return this;
  }
}
