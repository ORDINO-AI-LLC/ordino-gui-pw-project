import { test as base, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { LoginPage, DashboardPage } from '@config/page-loader';

// ── Configuration ────────────────────────────────────────────────

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ── Fixture Types ────────────────────────────────────────────────

type MyFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

// ── Fixture Implementations ──────────────────────────────────────

const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

export { test, expect };
