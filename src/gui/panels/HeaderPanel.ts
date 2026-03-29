import { Page, Locator } from '@playwright/test';
import { step } from '@config/utils/decorators';

export class HeaderPanel {
  private profileBadge: Locator;
  private profileName:  Locator;

  constructor(private page: Page) {
    this.profileBadge = page.locator('.oxd-userdropdown');
    this.profileName  = page.locator('.oxd-userdropdown-name');
  }

  @step
  async getProfileName(): Promise<string> {
    await this.profileName.waitFor({ state: 'visible' });
    return (await this.profileName.innerText()).trim();
  }

  @step
  async openProfileMenu(): Promise<this> {
    await this.profileBadge.click();
    return this;
  }
}
