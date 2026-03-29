import { Page, Locator, TestInfo } from '@playwright/test';

export class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async waitForPageLoad(): Promise<this> {
    await this.page.waitForLoadState('domcontentloaded');
    return this;
  }

  async waitForElement(locator: Locator, timeout = 10000): Promise<this> {
    await locator.waitFor({ state: 'visible', timeout });
    return this;
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  async attachScreenshot(testInfo: TestInfo, name = 'screenshot'): Promise<void> {
    const screenshot = await this.page.screenshot({ fullPage: true });
    await testInfo.attach(name, { body: screenshot, contentType: 'image/png' });
  }
}
