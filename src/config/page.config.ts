import { test as base, expect, Browser, Page } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { LoginPage, DashboardPage } from '@config/page-loader';

// ── Configuration ────────────────────────────────────────────────

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Auth file path (matches global-setup output: src/config/utils/admin.json)
const AUTH_FILE = path.resolve(__dirname, 'utils/admin.json');

// ── Fixture Types ────────────────────────────────────────────────

type MyFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  authenticatedPage: Page;
};

// ── Fixture Implementations ──────────────────────────────────────

const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  authenticatedPage: async ({ browser }, use) => {
    const storageState = fs.existsSync(AUTH_FILE) ? AUTH_FILE : undefined;
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();

    await use(page);

    await context.close();
  },
});

export { test, expect };
