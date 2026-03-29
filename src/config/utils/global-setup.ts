import { chromium, Browser, Page } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { CredentialResolver } from '../data/loaders';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const AUTH_DIR = path.resolve(__dirname, '.');

async function authenticateAdmin(page: Page): Promise<boolean> {
  try {
    console.log('\n  [Admin User] Authenticating...');
    const admin = CredentialResolver.getUser('admin');

    await page.goto(`${process.env.BASE_URL}/web/index.php/auth/login`, {
      waitUntil: 'networkidle',
    });

    // Ensure the login form is ready
    await page.locator('input[name="username"]').waitFor({ state: 'visible', timeout: 10000 });

    await page.fill('input[name="username"]', admin.username);
    await page.fill('input[name="password"]', admin.password);
    await page.click('button[type="submit"]');
    console.log(`  ✓ [Admin User] Login successful`);
    return true;
  } catch (error) {
    console.error(`  ✗ [Admin User] Error:`, error);
    return false;
  }
}

async function saveAuthState(page: Page, filename: string): Promise<void> {
  try {
    const filepath = path.join(AUTH_DIR, filename);
    await page.context().storageState({ path: filepath });
    console.log(`  → Auth state saved → src/config/utils/${filename}`);
  } catch (error) {
    console.error(`  ✗ Failed to save auth state:`, error);
  }
}

async function globalSetup(): Promise<void> {
  console.log('\n========== Global Setup: User Authentication ==========\n');

  // Create auth directory
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch();
    const page = await browser.newPage();

    try {
      const success = await authenticateAdmin(page);

      if (success) {
        await saveAuthState(page, 'admin.json');
      }
    } finally {
      await page.close();
    }

    console.log('\n========== Global Setup: Complete ==========\n');
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export default globalSetup;

