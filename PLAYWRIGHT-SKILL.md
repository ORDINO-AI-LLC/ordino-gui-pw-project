# Playwright Boilerplate Agent Skill

**Version:** 2.1
**Last Updated:** March 25, 2026
**Scope:** Test generation, code review, and project scaffolding for Playwright QA automation

---

## Executive Summary

This skill file ensures AI coding agents (Claude, GitHub Copilot, Cursor) and new team members generate Playwright tests that strictly adhere to this project's architecture, conventions, and best practices.

**Key Principle:** The boilerplate is the single source of truth. All new code must mirror its structure, conventions, and patterns exactly.

**Who this is for:**
- AI agents generating or reviewing test code
- New team members writing their first tests
- PR reviewers checking test quality

---

## 1. Project Architecture & File Structure

### 1.1 Directory Hierarchy

```
project-root/
├── .env                              # Configuration (BASE_URL, credentials) — tracked in git
├── .gitignore                        # Excludes node_modules, test-results, auth state
├── playwright.config.ts              # Playwright configuration (dotenv loaded here)
├── tsconfig.json                     # TypeScript compiler with path aliases
├── package.json                      # Scripts, dependencies (Playwright, TS, dotenv)
├── PLAYWRIGHT-SKILL.md               # This file — AI agent & team guidelines
│
├── src/
│   ├── config/
│   │   ├── page-loader.ts            # Barrel export registry for all page objects & panels
│   │   ├── page.config.ts            # Fixture definitions (loginPage, dashboardPage, authenticatedPage)
│   │   └── utils/
│   │       ├── global-setup.ts       # Pre-test authentication (runs once before all tests)
│   │       ├── decorators.ts         # @step decorator & logging utilities (logSuite, logTest, etc.)
│   │       └── admin.json            # Auto-generated auth session state (gitignored via clean script)
│   │
│   ├── config/
│   │   ├── data/                      # Test data source code (interfaces + loaders)
│   │   │   ├── interfaces/            # TypeScript shape definitions (type safety)
│   │   │   │   ├── common.interfaces.ts  # DataSet<T> generic type
│   │   │   │   ├── login.interfaces.ts   # LoginCredentials, LoginUsersFile, LoginExpectedFile
│   │   │   │   ├── dashboard.interfaces.ts # DashboardExpectedFile
│   │   │   │   └── index.ts              # Barrel export
│   │   │   └── loaders/               # Data access layer
│   │   │       ├── DataLoader.ts      # Generic JSON reader with cache
│   │   │       ├── CredentialResolver.ts # User credential resolver (JSON + .env override)
│   │   │       └── index.ts           # Barrel export
│   │
│   ├── data/                          # TESTER-EDITABLE — JSON only, no TypeScript
│   │   ├── login/
│   │   │   ├── users.json            # Test user credentials (admin, invalid, etc.)
│   │   │   └── expected.json         # Expected UI text (error messages, labels)
│   │   └── dashboard/
│   │       └── expected.json         # Expected titles, labels
│   │
│   └── gui/
│       ├── pages/
│       │   ├── BasePage.ts           # Abstract base class — all pages extend this
│       │   ├── LoginPage.ts          # Login workflow page object
│       │   ├── DashboardPage.ts      # Dashboard page object (composes HeaderPanel)
│       │   └── [NewPage].ts          # Additional pages follow same pattern
│       │
│       └── panels/
│           ├── HeaderPanel.ts        # Reusable header/profile dropdown component
│           └── [NewPanel].ts         # Additional reusable UI components
│
└── features/
    ├── login.spec.ts                 # Login test scenarios (clears auth state)
    ├── home.spec.ts                  # Dashboard test scenarios (uses authenticatedPage)
    └── [feature].spec.ts             # Additional feature tests
```

### 1.2 Non-Negotiable Architecture Rules

| # | Rule | Rationale |
|---|------|-----------|
| 1 | **All pages extend `BasePage`** | Consistency, shared utilities (`waitForPageLoad`, `getTitle`, `attachScreenshot`) |
| 2 | **Single responsibility** | One page object = one application page. One panel = one reusable UI section. No DOM logic in test files. |
| 3 | **Fixtures for dependency injection** | All page objects injected via `page.config.ts` fixtures. Tests never call `new PageObject()` directly (except with `authenticatedPage`). |
| 4 | **Configuration from `.env` only** | No hardcoded URLs, credentials, or fallback defaults in code. Use `process.env.VAR!` with non-null assertion. |
| 5 | **Page loader as single import source** | All page/panel imports go through `page-loader.ts`. No direct path imports in tests or fixtures. |
| 6 | **Tests in `features/` only** | Test directory is `./features`. Never `tests/`, `specs/`, or `__tests__/`. |

---

## 2. NPM Scripts Reference

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run ui:headed` | `playwright test --headed --project=chromium --workers=1 --trace on` | Run with visible browser, single worker, full tracing |
| `npm run ui:headless` | `playwright test --project=chromium` | Headless execution (CI-friendly) |
| `npm run ui:debug` | `playwright test --debug` | Open Playwright Inspector for step-through debugging |
| `npm run clean` | _(node script)_ | Remove `test-results/`, `playwright-report/`, and `admin.json` |
| `npm run audit` | `tsc --noEmit` | TypeScript type-checking only (no output files) |

---

## 3. Path Aliases (tsconfig.json)

All path aliases available in the project:

| Alias | Maps To | Usage |
|-------|---------|-------|
| `@pages/*` | `src/gui/pages/*` | Page object imports within `src/` |
| `@panels/*` | `src/gui/panels/*` | Panel/component imports within `src/` |
| `@gui/*` | `src/gui/*` | Any GUI layer import |
| `@config/*` | `src/config/*` | Config, fixtures, utilities |
| `@src/*` | `src/*` | Top-level src imports |
| `@data/*` | `src/config/data/*` | Test data interfaces & loaders |

### Import Rules

**Inside `src/` files** — use path aliases:
```typescript
// Page objects importing from other layers
import { LoginCredentials } from '@data/interfaces';
import { step } from '@config/utils/decorators';
import { HeaderPanel } from '@gui/panels/HeaderPanel';
```

**Inside `features/*.spec.ts` files** — two imports only:
```typescript
// 1. Native Playwright — test, expect from page.config (custom fixtures)
import { test } from '../src/config/page.config';

// 2. Everything else — from page-loader (single source)
import { CredentialResolver, DataLoader, LoginExpectedFile, logSuite, logTest } from '../src/config/page-loader';
```

**Rule: Tests have exactly two import sources:**
- `../src/config/page.config` — Playwright's `test` and `expect` (custom fixture extensions)
- `../src/config/page-loader` — all page objects, panels, data loaders, interfaces, and logging utilities

**Never import directly from:**
- `../src/config/data/loaders` ❌
- `../src/config/data/interfaces` ❌
- `../src/config/utils/decorators` ❌
- `../src/gui/pages/[PageName]` ❌

**Why:** `page-loader.ts` is the single registry. All non-Playwright imports funnel through it, keeping test files clean and consistent.

---

## 4. Page Object Design

### 4.1 BasePage (Immutable Base Class)

**File:** `src/gui/pages/BasePage.ts` — **Do not modify** unless adding generic cross-page utilities.

```typescript
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
```

### 4.2 Page Object Template

Every new page object must follow this exact structure:

```typescript
import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { step } from '@config/utils/decorators';

export class [PageName] extends BasePage {
  // ── Page Path ────────────────────────────────────────
  readonly path = '/path/to/page';

  // ── Locators (always private) ────────────────────────
  private someInput    = this.page.locator('input[name="field"]');
  private submitButton = this.page.locator('button[type="submit"]');
  private errorMessage = this.page.locator('.error-selector');

  // ── Constructor ──────────────────────────────────────
  constructor(page: Page) {
    super(page);
  }

  // ── Actions (step_* prefix) ──────────────────────────
  @step
  async step_navigate(): Promise<this> {
    await this.page.goto(this.path);
    await this.waitForPageLoad();
    return this;
  }

  @step
  async step_fillAndSubmit(data: SomeType): Promise<this> {
    await this.someInput.fill(data.value);
    await this.submitButton.click();
    await this.waitForPageLoad();
    return this;
  }

  // ── Verifications (verify_* prefix) ──────────────────
  @step
  async verify_onPage(): Promise<this> {
    await expect(this.page).toHaveURL(/expected-path/);
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
```

### 4.3 Naming Conventions

| Element | Convention | Examples |
|---------|-----------|----------|
| Action methods | `step_*` prefix | `step_login()`, `step_navigate()`, `step_fillForm()` |
| Verification methods | `verify_*` prefix | `verify_onDashboard()`, `verify_errorMessage()` |
| Page URL | `readonly path` | `readonly path = '/web/index.php/auth/login'` |
| DOM selectors | `private` class properties | `private usernameInput = this.page.locator(...)` |
| Return type | Always `Promise<this>` | Enables method chaining (except `getTitle()` etc.) |
| Decorator | `@step` on every public method | Automatic console logging of step execution |

### 4.4 Real Example — LoginPage.ts

```typescript
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
```

---

## 5. Panel (Component) Pattern

### 5.1 When to Create a Panel

Create a panel when a UI section:
- Appears on **multiple pages** (header, sidebar, footer)
- Has **complex internal interactions** (dropdowns, menus)
- Should be **independently reusable**

### 5.2 Panel Template

```typescript
import { Page, Locator } from '@playwright/test';
import { step } from '@config/utils/decorators';

export class [PanelName] {
  private someElement: Locator;

  constructor(private page: Page) {
    this.someElement = page.locator('.selector');
  }

  @step
  async getSomeValue(): Promise<string> {
    await this.someElement.waitFor({ state: 'visible' });
    return (await this.someElement.innerText()).trim();
  }

  @step
  async clickSomething(): Promise<this> {
    await this.someElement.click();
    return this;
  }
}
```

**Key differences from Page Objects:**
- Panels do **not** extend `BasePage`
- Panels use `constructor(private page: Page)` shorthand
- Locators are initialized in the constructor body (not as class properties)
- Panels are composed into page objects, not used directly in tests

### 5.3 Composing Panels into Pages

```typescript
export class DashboardPage extends BasePage {
  readonly topNav: HeaderPanel;  // Panel as a readonly property

  constructor(page: Page) {
    super(page);
    this.topNav = new HeaderPanel(page);  // Instantiate in constructor
  }

  @step
  async verify_profileName(): Promise<this> {
    const name = await this.topNav.getProfileName();  // Delegate to panel
    expect(name.length).toBeGreaterThan(0);
    return this;
  }
}
```

---

## 6. Test Structure & Conventions

### 6.1 Test File Template — Standard Fixtures

Use this pattern when testing flows that start from a known page (login, forms, etc.):

```typescript
import { test, expect } from '../src/config/page.config';
import { CredentialResolver } from '../src/config/data/loaders';
import { DataLoader } from '../src/config/data/loaders';
import { LoginExpectedFile } from '../src/config/data/interfaces';
import { logSuite, logTest } from '../src/config/utils/decorators';

// Load expected values from JSON (tester-editable)
const expected = DataLoader.load<LoginExpectedFile>('login/expected');

// Clear auth state when explicitly testing login flow
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Feature Name - Scenario Group', () => {
  logSuite('Feature Name - Scenario Group');

  test('should do something when condition', async ({ loginPage, dashboardPage }) => {
    logTest('should do something when condition');

    // Arrange
    await loginPage.step_navigate();

    // Act
    await loginPage.step_login(CredentialResolver.getUser('admin'));

    // Assert
    await dashboardPage.verify_onDashboard();
    await dashboardPage.verify_profileName();
  });

  test('should show error for invalid input', async ({ loginPage }) => {
    logTest('should show error for invalid input');
    await loginPage.step_navigate();
    await loginPage.step_login(CredentialResolver.getUser('invalid'));
    await loginPage.verify_errorMessage(expected.errors.invalidCredentials);
  });
});
```

### 6.2 Test File Template — Authenticated Session

Use this pattern when testing pages that require a logged-in user (skip login flow):

```typescript
import { test, expect } from '../src/config/page.config';
import { DataLoader } from '../src/config/data/loaders';
import { DashboardExpectedFile } from '../src/config/data/interfaces';
import { logSuite, logTest } from '../src/config/utils/decorators';
import { DashboardPage } from '../src/gui/pages/DashboardPage';

// Load expected values from JSON (tester-editable)
const expected = DataLoader.load<DashboardExpectedFile>('dashboard/expected');

test.describe('Feature Name - Authenticated', () => {
  logSuite('Feature Name - Authenticated');

  test('should display page after authenticated session', async ({ authenticatedPage }) => {
    logTest('should display page after authenticated session');
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.step_navigate();
    await dashboard.verify_onDashboard();
    await dashboard.verify_pageTitle(expected.labels.pageTitle);
    await dashboard.verify_profileName();
  });
});
```

**When to use which pattern:**

| Pattern | When | Auth State |
|---------|------|------------|
| Standard fixtures (`loginPage`, `dashboardPage`) | Testing login flow or starting from login | `test.use({ storageState: { cookies: [], origins: [] } })` clears auth |
| `authenticatedPage` fixture | Testing pages behind login (skip login step) | Restores session from `admin.json` |

**Note:** When using `authenticatedPage`, you instantiate page objects manually with the authenticated page instance since it uses a separate browser context.

### 6.3 Test Naming Convention

```
should [expected behavior] when/for [condition/context]
```

Examples:
- `should login successfully and verify profile name on home page`
- `should show error message for invalid credentials`
- `should display dashboard home page with profile visible after authenticated session`

### 6.4 Test Rules

**Rule 1: Import `test` and `expect` from `page.config.ts`**
```typescript
// CORRECT — custom fixtures available
import { test, expect } from '../src/config/page.config';

// WRONG — no custom fixtures
import { test, expect } from '@playwright/test';
```

**Rule 2: Use fixtures, never instantiate pages directly (except with authenticatedPage)**
```typescript
// CORRECT — fixture injection
test('scenario', async ({ loginPage }) => {
  await loginPage.step_navigate();
});

// WRONG — direct instantiation
test('scenario', async ({ page }) => {
  const loginPage = new LoginPage(page);
});
```

**Rule 3: Keep tests business-focused — no DOM logic**
```typescript
// CORRECT — high-level, readable
await loginPage.step_login(CredentialResolver.getUser('admin'));

// WRONG — DOM selectors in test
await page.fill('input[name="username"]', 'Admin');
await page.click('button[type="submit"]');
```

**Rule 4: Use test data constants, never hardcoded values**
```typescript
// CORRECT
await loginPage.step_login(CredentialResolver.getUser('admin'));

// WRONG
await loginPage.step_login({ username: 'Admin', password: 'admin123' });
```

**Rule 5: Always include logging calls**
```typescript
test.describe('Suite Name', () => {
  logSuite('Suite Name');           // First line of describe block

  test('test name', async ({ ... }) => {
    logTest('test name');           // First line of test body
    // ... test steps
  });
});
```

**Rule 6: Use sequential `await` statements (not chaining)**
```typescript
// CORRECT — clear, debuggable
await loginPage.step_navigate();
await loginPage.step_login(CredentialResolver.getUser('admin'));
await dashboardPage.verify_onDashboard();

// AVOID — harder to debug, unclear stack traces
await (await (await loginPage.step_navigate()).step_login(CredentialResolver.getUser('admin')));
```

---

## 7. Fixture Management

### 7.1 Fixture Architecture

**File:** `src/config/page.config.ts`

```typescript
import { test as base, expect, Browser, Page } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { LoginPage, DashboardPage } from '@config/page-loader';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const AUTH_FILE = path.resolve(__dirname, 'utils/admin.json');

type MyFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  authenticatedPage: Page;
};

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
```

### 7.2 Adding a New Fixture

When creating a new page object, register it as a fixture:

**Step 1:** Add to the `MyFixtures` type:
```typescript
type MyFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  authenticatedPage: Page;
  newPage: NewPage;             // Add here
};
```

**Step 2:** Add the fixture implementation:
```typescript
newPage: async ({ page }, use) => {
  await use(new NewPage(page));
},
```

**Step 3:** Import the page from page-loader:
```typescript
import { LoginPage, DashboardPage, NewPage } from '@config/page-loader';
```

---

## 8. Page Loader (Barrel Exports)

### 8.1 Current Registry

**File:** `src/config/page-loader.ts`

```typescript
export { LoginPage } from '../gui/pages/LoginPage';
export { DashboardPage } from '../gui/pages/DashboardPage';
export { HeaderPanel } from '../gui/panels/HeaderPanel';
```

### 8.2 Current Registry

```typescript
// ── Page Objects ─────────────────────────────────────────────
export { LoginPage } from '../gui/pages/LoginPage';
export { DashboardPage } from '../gui/pages/DashboardPage';

// ── Panels ───────────────────────────────────────────────────
export { HeaderPanel } from '../gui/panels/HeaderPanel';

// ── Data Loaders ─────────────────────────────────────────────
export { DataLoader } from './data/loaders/DataLoader';
export { CredentialResolver } from './data/loaders/CredentialResolver';

// ── Data Interfaces ──────────────────────────────────────────
export * from './data/interfaces';

// ── Logging & Decorators ─────────────────────────────────────
export { logSuite, logTest, logField, logUrl, logSep, logSuccess, step } from './utils/decorators';
```

### 8.3 Rules

- **Every new page object must be exported here**
- **Every new panel must be exported here**
- **Every new data interface must be exported here** (via `export * from './data/interfaces'`)
- **Tests import ONLY from `page-loader` (and native `page.config` for `test`)**
- Fixture file (`page.config.ts`) imports pages/panels from `page-loader.ts`

---

## 9. Test Data Management (JSON-Based Model)

### 9.1 Architecture Overview

Test data follows a **three-layer architecture** designed so testers edit JSON while developers maintain type safety:

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: JSON Data Files (tester-editable, no TS needed)   │
│  src/data/login/users.json                             │
│  src/data/login/expected.json                          │
│  src/data/dashboard/expected.json                      │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Loaders (read JSON, apply overrides, cache)       │
│  src/config/data/loaders/DataLoader.ts                             │
│  src/config/data/loaders/CredentialResolver.ts                     │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: Interfaces (TypeScript type definitions)          │
│  src/config/data/interfaces/login.interfaces.ts                    │
│  src/config/data/interfaces/dashboard.interfaces.ts                │
└─────────────────────────────────────────────────────────────┘
```

**SOLID principles applied:**
- **S** — `DataLoader` reads JSON. `CredentialResolver` resolves credentials. Each has one job.
- **O** — New feature = new JSON file + interface. No existing code changes.
- **L** — Any `LoginCredentials` works regardless of source (JSON, .env override).
- **I** — Per-feature interfaces, no god-object.
- **D** — Page objects depend on interfaces, not on loaders or JSON files.

### 9.2 JSON Data Files (Tester-Editable)

**`src/data/login/users.json`** — test user credentials:
```json
{
  "_comment": "Test user credentials. Admin can be overridden by .env.",
  "users": {
    "admin": {
      "username": "Admin",
      "password": "admin123"
    },
    "invalid": {
      "username": "invalid_user",
      "password": "wrong_password"
    }
  }
}
```

**`src/data/login/expected.json`** — expected UI text:
```json
{
  "_comment": "Expected UI text for login feature verification.",
  "errors": {
    "invalidCredentials": "Invalid credentials",
    "requiredField": "Required",
    "accountDisabled": "Account disabled"
  },
  "labels": {
    "pageTitle": "OrangeHRM",
    "loginButtonText": "Login"
  }
}
```

**`src/data/dashboard/expected.json`** — expected dashboard text:
```json
{
  "_comment": "Expected UI text for dashboard verification.",
  "labels": {
    "pageTitle": "OrangeHRM",
    "headerTitle": "Dashboard"
  }
}
```

### 9.3 Data Loaders

**`DataLoader`** — generic JSON reader:
```typescript
import { DataLoader } from '../src/config/data/loaders';
import { LoginExpectedFile } from '../src/config/data/interfaces';

// Load by feature path (resolves to src/data/login/expected.json)
const expected = DataLoader.load<LoginExpectedFile>('login/expected');
console.log(expected.errors.invalidCredentials); // "Invalid credentials"
```

**`CredentialResolver`** — user credentials with .env override:
```typescript
import { CredentialResolver } from '../src/config/data/loaders';

// Get a specific user
const admin = CredentialResolver.getUser('admin');

// Get all users (for data-driven tests)
const allUsers = CredentialResolver.getAllUsers();
```

**Credential resolution strategy:**
```
CredentialResolver.getUser('admin')
  ├─ Load src/data/login/users.json
  ├─ If .env has ADMIN_USERNAME + ADMIN_PASSWORD → override 'admin' entry
  └─ Return LoginCredentials object
```

### 9.4 Tester Workflow

**To add a new test user** (no TypeScript needed):
1. Open `src/data/login/users.json`
2. Add: `"newUser": { "username": "...", "password": "..." }`
3. Done. Tests use `CredentialResolver.getUser('newUser')`

**To update expected error messages:**
1. Open `src/data/login/expected.json`
2. Edit the value under `errors.invalidCredentials`
3. Done. All tests referencing this value update automatically.

**To add test data for a new feature:**
1. Create JSON file: `src/data/[feature]/[datatype].json`
2. Create interface: `src/config/data/interfaces/[feature].interfaces.ts`
3. Export from `src/config/data/interfaces/index.ts`
4. Load in tests: `DataLoader.load<NewInterface>('[feature]/[datatype]')`

### 9.5 Adding New Feature Test Data (Developer Workflow)

**Step 1:** Create the JSON file — `src/data/employee/data.json`:
```json
{
  "_comment": "Employee test data for PIM module.",
  "employees": {
    "valid": { "firstName": "John", "lastName": "Doe", "employeeId": "EMP001" },
    "minimal": { "firstName": "Jane", "lastName": "Smith", "employeeId": "" }
  }
}
```

**Step 2:** Create the interface — `src/config/data/interfaces/employee.interfaces.ts`:
```typescript
export interface EmployeeData {
  firstName: string;
  lastName: string;
  employeeId: string;
}

export interface EmployeeDataFile {
  employees: Record<string, EmployeeData>;
}
```

**Step 3:** Export from barrel — `src/config/data/interfaces/index.ts`:
```typescript
export * from './employee.interfaces';
```

**Step 4:** Use in page objects:
```typescript
import { EmployeeData } from '@data/interfaces';

@step
async step_createEmployee(data: EmployeeData): Promise<this> {
  await this.firstNameInput.fill(data.firstName);
  return this;
}
```

**Step 5:** Use in tests:
```typescript
import { DataLoader } from '../src/config/data/loaders';
import { EmployeeDataFile } from '../src/config/data/interfaces';

const empData = DataLoader.load<EmployeeDataFile>('employee/data');

test('should create employee', async ({ employeePage }) => {
  await employeePage.step_createEmployee(empData.employees.valid);
});
```

### 9.6 Data-Driven Parameterized Tests

```typescript
import { CredentialResolver } from '../src/config/data/loaders';
import { DataLoader } from '../src/config/data/loaders';
import { LoginExpectedFile } from '../src/config/data/interfaces';

const expected = DataLoader.load<LoginExpectedFile>('login/expected');

// Test every non-admin user gets an error — add users to JSON to add test cases
const negativeUsers = Object.entries(CredentialResolver.getAllUsers())
  .filter(([key]) => key !== 'admin');

for (const [userKey, credentials] of negativeUsers) {
  test(`should show error for user: ${userKey}`, async ({ loginPage }) => {
    await loginPage.step_navigate();
    await loginPage.step_login(credentials);
    await loginPage.verify_errorMessage(expected.errors.invalidCredentials);
  });
}
```

### 9.7 Rules

- All test data lives in `src/data/` as JSON files — never hardcode in tests or page objects
- All TypeScript interfaces live in `src/config/data/interfaces/`
- Use `DataLoader.load<T>()` to read JSON — never `import` JSON directly
- Use `CredentialResolver.getUser()` for credentials — never read `.env` directly in tests
- Use descriptive key names in JSON (`admin`, `invalid`, `locked`, `withSpecialChars`)
- Use `_comment` field in JSON for documentation (JSON has no native comments)

---

## 10. Global Setup & Authentication

### 10.1 How It Works

**File:** `src/config/utils/global-setup.ts`

Runs **once** before the entire test suite:
1. Launches a Chromium browser
2. Navigates to the login page
3. Authenticates with admin credentials via `CredentialResolver.getUser('admin')`
4. Saves cookies + localStorage to `src/config/utils/admin.json`
5. Closes the browser

The `authenticatedPage` fixture then reads `admin.json` to create pre-authenticated browser contexts.

**Credential flow:** `CredentialResolver` loads from `json/login/users.json`, then overrides `admin` with `.env` values if present (CI/CD support).

### 10.2 Adapting for a New Application

Update three things in `global-setup.ts`:

```typescript
// 1. Login URL
await page.goto(`${process.env.BASE_URL}/new/login/path`, {
  waitUntil: 'networkidle',
});

// 2. Login form selectors
await page.locator('new-username-selector').fill(ADMIN_USERNAME);
await page.locator('new-password-selector').fill(ADMIN_PASSWORD);
await page.click('new-submit-selector');

// 3. Success indicator (optional — adjust if needed)
// Current: relies on no error thrown after click
```

---

## 11. Decorator & Logging System

### 11.1 @step Decorator

**File:** `src/config/utils/decorators.ts`

Applied to every public method in page objects and panels. Automatically logs method names on execution:

```
  ✔  step_navigate
  ✔  step_login
  ✔  verify_onDashboard
```

**Usage:**
```typescript
@step
async step_login(credentials: LoginCredentials): Promise<this> {
  // Method body — logging happens automatically
  return this;
}
```

Supports both legacy `experimentalDecorators` and new TC39 decorator syntax.

### 11.2 Logging Functions

| Function | Output | Where to Use |
|----------|--------|-------------|
| `logSuite(name)` | `@suite -> Name` | First line of `test.describe()` |
| `logTest(name)` | `  @test -> Name` | First line of each `test()` |
| `logField(label, value)` | `  Label                : value` | Page objects for debugging |
| `logUrl(label, url)` | `  Label                → url` | Page objects for debugging |
| `logSep()` | `━━━━━━━━━━━━━━━...` | Visual separator |
| `logSuccess(msg)` | `  ✔  msg` | Used internally by `@step` |

---

## 12. Playwright Configuration

### 12.1 Full Configuration

**File:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './features',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,

  globalSetup: './src/config/utils/global-setup',
  outputDir: './test-results/runs',
  preserveOutput: 'failures-only',

  reporter: [
    ['html', { outputFolder: 'test-results/html-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.BASE_URL,
    trace: 'on',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--no-sandbox'],
        },
      },
    },
  ],
});
```

### 12.2 Key Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| `testDir` | `./features` | All tests live here |
| `fullyParallel` | `false` | Tests run sequentially |
| `retries` | 2 in CI, 1 local | Flaky detection locally; more retries in CI |
| `workers` | 1 in CI, unlimited local | Single worker in CI |
| `trace` | `on` | Trace captured for every test (embedded in HTML report) |
| `screenshot` | `only-on-failure` | Auto-screenshot on failure |
| `video` | `retain-on-failure` | Video recording kept on failure |
| `actionTimeout` | 15000ms | Max wait for clicks/fills |
| `navigationTimeout` | 30000ms | Max wait for page navigation |
| `globalSetup` | `./src/config/utils/global-setup` | Pre-test authentication |

### 12.3 Output Artifacts (Every Run)

| Artifact | Location | Purpose |
|----------|----------|---------|
| HTML report + traces | `test-results/html-report/index.html` | Visual report with embedded trace viewer & network logs per test |
| JSON report | `test-results/results.json` | Machine-readable results |
| JUnit XML | `test-results/results.xml` | CI/CD integration |
| Screenshots | `test-results/runs/[test]/` | Failure evidence (failures only) |
| Video | `test-results/runs/[test]/` | Failure recording (failures only) |

> **Note:** Network logs are captured inside the trace viewer. Open `html-report/index.html`, click any test, then open the **Network** tab in the trace panel.

---

## 13. Environment Configuration

### 13.1 .env File

```bash
# Application Base URL
BASE_URL=https://opensource-demo.orangehrmlive.com

# Admin Credentials
ADMIN_USERNAME=Admin
ADMIN_PASSWORD=admin123
```

### 13.2 Rules

- `.env` **is tracked in git** (unlike typical projects) for quick project setup
- No hardcoded fallback defaults: use `process.env.VAR!` (non-null assertion)
- `dotenv` is loaded in three places:
  - `playwright.config.ts` — `dotenv.config()`
  - `page.config.ts` — `dotenv.config({ path: ... })`
  - `global-setup.ts` — `dotenv.config({ path: ... })`

---

## 14. Step-by-Step: Creating a New Test

Follow this walkthrough when adding a test for a new feature.

### Scenario: Add tests for an "Employee List" page

**Step 1: Create the Page Object** — `src/gui/pages/EmployeeListPage.ts`

```typescript
import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { step } from '@config/utils/decorators';

export class EmployeeListPage extends BasePage {
  readonly path = '/web/index.php/pim/viewEmployeeList';

  private searchInput   = this.page.locator('input[placeholder="Type for hints..."]');
  private searchButton  = this.page.locator('button[type="submit"]');
  private employeeTable = this.page.locator('.oxd-table-body');
  private noRecordsText = this.page.locator('.oxd-toast-content');

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
  async step_searchEmployee(name: string): Promise<this> {
    await this.searchInput.fill(name);
    await this.searchButton.click();
    await this.waitForPageLoad();
    return this;
  }

  @step
  async verify_onEmployeeList(): Promise<this> {
    await expect(this.page).toHaveURL(/viewEmployeeList/);
    return this;
  }

  @step
  async verify_tableVisible(): Promise<this> {
    await this.employeeTable.waitFor({ state: 'visible' });
    return this;
  }
}
```

**Step 2: Export in Page Loader** — `src/config/page-loader.ts`

```typescript
export { LoginPage } from '../gui/pages/LoginPage';
export { DashboardPage } from '../gui/pages/DashboardPage';
export { EmployeeListPage } from '../gui/pages/EmployeeListPage';  // ADD

export { HeaderPanel } from '../gui/panels/HeaderPanel';
```

**Step 3: Register Fixture** — `src/config/page.config.ts`

Add to `MyFixtures` type:
```typescript
type MyFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  employeeListPage: EmployeeListPage;  // ADD
  authenticatedPage: Page;
};
```

Add fixture implementation:
```typescript
employeeListPage: async ({ page }, use) => {
  await use(new EmployeeListPage(page));
},
```

Update import:
```typescript
import { LoginPage, DashboardPage, EmployeeListPage } from '@config/page-loader';
```

**Step 4: Add Test Data** (if needed) — `src/data/employee-list/search.json`

```json
{
  "_comment": "Employee list search test data.",
  "searches": {
    "existing": "Paul",
    "nonExistent": "zzzzNonExistent"
  }
}
```

**Step 5: Write the Test** — `features/employee-list.spec.ts`

```typescript
import { test, expect } from '../src/config/page.config';
import { DataLoader } from '../src/config/data/loaders';
import { logSuite, logTest } from '../src/config/utils/decorators';

test.describe('OrangeHRM - Employee List', () => {
  logSuite('OrangeHRM - Employee List');

  test('should navigate to employee list page after authenticated session', async ({ authenticatedPage }) => {
    logTest('should navigate to employee list page after authenticated session');
    const employeeList = new (await import('../src/gui/pages/EmployeeListPage')).EmployeeListPage(authenticatedPage);
    await employeeList.step_navigate();
    await employeeList.verify_onEmployeeList();
    await employeeList.verify_tableVisible();
  });
});
```

**Step 6: Verify**

```bash
npm run audit          # TypeScript compiles without errors
npm run ui:headless    # All tests pass
```

---

## 15. Step-by-Step: Creating a New Panel

### Scenario: Add a reusable Sidebar Navigation panel

**Step 1: Create the Panel** — `src/gui/panels/SidebarPanel.ts`

```typescript
import { Page, Locator } from '@playwright/test';
import { step } from '@config/utils/decorators';

export class SidebarPanel {
  private menuItems: Locator;
  private searchInput: Locator;

  constructor(private page: Page) {
    this.menuItems = page.locator('.oxd-main-menu-item');
    this.searchInput = page.locator('.oxd-main-menu-search input');
  }

  @step
  async clickMenuItem(name: string): Promise<this> {
    await this.menuItems.filter({ hasText: name }).click();
    return this;
  }

  @step
  async searchMenu(text: string): Promise<this> {
    await this.searchInput.fill(text);
    return this;
  }
}
```

**Step 2: Export in Page Loader** — add to `src/config/page-loader.ts`:
```typescript
export { SidebarPanel } from '../gui/panels/SidebarPanel';
```

**Step 3: Compose into a Page Object** (if used on specific pages):
```typescript
export class DashboardPage extends BasePage {
  readonly topNav: HeaderPanel;
  readonly sidebar: SidebarPanel;  // ADD

  constructor(page: Page) {
    super(page);
    this.topNav = new HeaderPanel(page);
    this.sidebar = new SidebarPanel(page);  // ADD
  }
}
```

---

## 16. Code Review Checklist

Use this checklist when reviewing PRs that add or modify test code.

### Page Object Review

| # | Check | Pass? |
|---|-------|-------|
| 1 | Extends `BasePage` |  |
| 2 | Has `readonly path` property |  |
| 3 | All locators are `private` |  |
| 4 | Actions use `step_*` prefix |  |
| 5 | Verifications use `verify_*` prefix |  |
| 6 | All public methods have `@step` decorator |  |
| 7 | All methods return `Promise<this>` (except utility getters) |  |
| 8 | Constructor calls `super(page)` |  |
| 9 | Imports use path aliases (`@config/*`, `@src/*`, `@gui/*`) |  |
| 10 | No hardcoded test data — uses `@data/interfaces` types |  |
| 11 | Exported in `page-loader.ts` |  |
| 12 | Registered as fixture in `page.config.ts` |  |
| 13 | `npm run audit` passes (TypeScript compiles) |  |

### Panel Review

| # | Check | Pass? |
|---|-------|-------|
| 1 | Does **not** extend `BasePage` |  |
| 2 | Uses `constructor(private page: Page)` pattern |  |
| 3 | Locators initialized in constructor body |  |
| 4 | All public methods have `@step` decorator |  |
| 5 | Exported in `page-loader.ts` |  |
| 6 | Composed into relevant page objects (not used directly in tests) |  |

### Test Review

| # | Check | Pass? |
|---|-------|-------|
| 1 | Located in `features/` directory |  |
| 2 | File named `[feature].spec.ts` |  |
| 3 | Imports `test, expect` from `../src/config/page.config` |  |
| 4 | Uses fixtures (not `new PageObject(page)`) for standard tests |  |
| 5 | Uses `authenticatedPage` correctly for pre-auth tests |  |
| 6 | Has `test.use({ storageState: ... })` if testing login flow |  |
| 7 | Includes `logSuite()` at start of `test.describe()` |  |
| 8 | Includes `logTest()` at start of each `test()` |  |
| 9 | No DOM selectors or `page.locator()` calls in test body |  |
| 10 | Test data from JSON via `DataLoader`/`CredentialResolver`, no hardcoded values |  |
| 11 | Test names follow `should [behavior] when/for [condition]` |  |
| 12 | Uses sequential `await` (not chained promises) |  |
| 13 | `npm run ui:headless` passes |  |

---

## 17. Anti-Patterns & Common Mistakes

### Mistake 1: DOM Logic in Tests

```typescript
// WRONG — selectors belong in page objects
test('should login', async ({ page }) => {
  await page.fill('input[name="username"]', 'Admin');
  await page.click('button[type="submit"]');
});

// CORRECT
test('should login', async ({ loginPage }) => {
  await loginPage.step_navigate();
  await loginPage.step_login(CredentialResolver.getUser('admin'));
});
```

### Mistake 2: Hardcoded Credentials

```typescript
// WRONG — hardcoded values
await loginPage.step_login({ username: 'Admin', password: 'admin123' });

// CORRECT — from CredentialResolver (reads JSON + .env override)
await loginPage.step_login(CredentialResolver.getUser('admin'));
```

### Mistake 3: Missing @step Decorator

```typescript
// WRONG — no logging, invisible in output
async step_navigate(): Promise<this> {
  await this.page.goto(this.path);
  return this;
}

// CORRECT
@step
async step_navigate(): Promise<this> {
  await this.page.goto(this.path);
  return this;
}
```

### Mistake 4: Public Locators

```typescript
// WRONG — locators should be encapsulated
public usernameInput = this.page.locator('input[name="username"]');

// CORRECT
private usernameInput = this.page.locator('input[name="username"]');
```

### Mistake 5: Importing from Wrong Source

```typescript
// WRONG — bypasses fixture system
import { test, expect } from '@playwright/test';

// CORRECT — includes custom fixtures
import { test } from '../src/config/page.config';
```

### Mistake 5b: Scattering Imports Instead of Using page-loader

```typescript
// WRONG — multiple import sources in test files
import { CredentialResolver } from '../src/config/data/loaders';
import { DataLoader } from '../src/config/data/loaders';
import { LoginExpectedFile } from '../src/config/data/interfaces';
import { logSuite, logTest } from '../src/config/utils/decorators';
import { DashboardPage } from '../src/gui/pages/DashboardPage';

// CORRECT — one import for everything except test/expect
import { CredentialResolver, DataLoader, LoginExpectedFile, logSuite, logTest } from '../src/config/page-loader';
```

### Mistake 6: Direct Page Instantiation (with standard fixtures)

```typescript
// WRONG
test('scenario', async ({ page }) => {
  const loginPage = new LoginPage(page);
});

// CORRECT
test('scenario', async ({ loginPage }) => {
  await loginPage.step_navigate();
});
```

### Mistake 7: Hardcoded Environment Values

```typescript
// WRONG
const baseUrl = process.env.BASE_URL || 'https://default.com';

// CORRECT — fail fast if missing
const baseUrl = process.env.BASE_URL!;
```

### Mistake 8: Hardcoded Expected Values in Tests

```typescript
// WRONG — hardcoded string in test
await loginPage.verify_errorMessage('Invalid credentials');
await dashboard.verify_pageTitle('OrangeHRM');

// CORRECT — from JSON data files (tester-editable)
const expected = DataLoader.load<LoginExpectedFile>('login/expected');
await loginPage.verify_errorMessage(expected.errors.invalidCredentials);
```

### Mistake 9: Reading Credentials Directly from .env

```typescript
// WRONG — bypasses CredentialResolver, duplicates logic
const username = process.env.ADMIN_USERNAME!;
const password = process.env.ADMIN_PASSWORD!;

// CORRECT — single source of truth with .env override support
const admin = CredentialResolver.getUser('admin');
```

### Mistake 10: Forgetting to Register New Pages

Creating a page object but forgetting to:
1. Export it in `page-loader.ts`
2. Add fixture in `page.config.ts`
3. Add to `MyFixtures` type

All three steps are required for every new page.

### Mistake 11: Not Returning `this`

```typescript
// WRONG — breaks method chaining contract
@step
async step_navigate(): Promise<void> {
  await this.page.goto(this.path);
}

// CORRECT
@step
async step_navigate(): Promise<this> {
  await this.page.goto(this.path);
  return this;
}
```

### Mistake 12: Missing Logging Calls

```typescript
// WRONG — no visibility in test output
test.describe('Suite', () => {
  test('test name', async ({ loginPage }) => {
    await loginPage.step_navigate();
  });
});

// CORRECT
test.describe('Suite', () => {
  logSuite('Suite');
  test('test name', async ({ loginPage }) => {
    logTest('test name');
    await loginPage.step_navigate();
  });
});
```

---

## 18. Troubleshooting

### "Cannot find module" errors

**Cause:** Path alias not configured or page not exported.

**Fix:**
1. Verify `tsconfig.json` has the alias
2. Check `page-loader.ts` exports the module
3. Run `npm run audit` to validate TypeScript

### Tests fail with "storageState" errors

**Cause:** `admin.json` is missing or corrupted.

**Fix:**
```bash
npm run clean          # Remove stale auth state
npm run ui:headless    # Re-runs global setup
```

### Global setup authentication fails

**Cause:** Target app is down, or selectors have changed.

**Fix:**
1. Check `BASE_URL` in `.env` is accessible
2. Run `npm run ui:debug` to step through
3. Verify login form selectors in `global-setup.ts`

### TypeScript decorator errors

**Cause:** Missing decorator config in `tsconfig.json`.

**Required settings:**
```json
{
  "experimentalDecorators": true,
  "emitDecoratorMetadata": true
}
```

### Tests pass locally but fail in CI

**Check:**
- `retries` is set to 2 in CI (`process.env.CI ? 2 : 0`)
- `workers` is 1 in CI (prevents race conditions)
- `--no-sandbox` flag is set in browser launch options
- Target application is accessible from CI environment

---

## 19. Project Adaptation Workflow

When adapting this boilerplate for a new application:

| Step | Action | Files to Change |
|------|--------|----------------|
| 1 | Copy boilerplate | `cp -r ordino-gui-pw-project new-project` |
| 2 | Update environment | `.env` — new `BASE_URL`, credentials |
| 3 | Update project metadata | `package.json` — `name`, `description` |
| 4 | Update global setup | `global-setup.ts` — login URL, selectors, success check |
| 5 | Replace sample pages | `src/gui/pages/` — new page objects for target app |
| 6 | Replace sample panels | `src/gui/panels/` — new components for target app |
| 7 | Update page loader | `page-loader.ts` — export new pages/panels |
| 8 | Update fixtures | `page.config.ts` — register new page fixtures |
| 9 | Update test data | `src/data/` — JSON files + `src/config/data/interfaces/` |
| 10 | Write feature tests | `features/` — new test specs |
| 11 | Verify | `npm run audit && npm run ui:headless` |

---

## 20. Quick Reference

| Aspect | Location | Key Rule |
|--------|----------|----------|
| **Config** | `.env` | Single source of truth, no fallback defaults |
| **Base Class** | `src/gui/pages/BasePage.ts` | Immutable — all pages extend this |
| **Page Objects** | `src/gui/pages/*.ts` | Extend BasePage, `@step`, `step_*/verify_*`, return `this` |
| **Panels** | `src/gui/panels/*.ts` | No BasePage, compose into pages |
| **Test Data (JSON)** | `src/data/` | Tester-editable JSON files, no TS needed |
| **Data Interfaces** | `src/config/data/interfaces/` | TypeScript shape definitions |
| **Data Loaders** | `src/config/data/loaders/` | `DataLoader` + `CredentialResolver` |
| **Tests** | `features/*.spec.ts` | Sequential await, fixture injection, `logSuite/logTest` |
| **Fixtures** | `src/config/page.config.ts` | Centralized, exports `test` and `expect` |
| **Page Registry** | `src/config/page-loader.ts` | Barrel exports — single import source |
| **Decorators** | `src/config/utils/decorators.ts` | `@step` + logging utilities |
| **Auth Setup** | `src/config/utils/global-setup.ts` | Pre-test auth, saves `admin.json` |
| **TS Config** | `tsconfig.json` | Strict mode, 6 path aliases, decorators enabled |
| **PW Config** | `playwright.config.ts` | Chromium only, CI-aware retries/workers |

---

## Versioning

- **Skill Version:** 2.0
- **Last Updated:** March 25, 2026
- **Compatible with:** Playwright 1.55+, TypeScript 5.9+, Node 18+
- **Dependencies:** `@playwright/test`, `typescript`, `dotenv`, `@types/node`
