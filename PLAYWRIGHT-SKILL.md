---
skill: playwright-page-object-suite
title: Playwright Page-Object Test Suite Skill
version: 3.1
updated: 2026-05-02
mime: text/markdown
license: project-internal
audience: |
  A tester who has only:
    (a) a BASE_URL of a target web application, and
    (b) a list of test scenarios written in plain English.
  No prior access to a reference project, no source code samples beyond what is in this file.
  Following this document end-to-end MUST produce a runnable Playwright TypeScript suite
  whose structure, naming, and conventions match this skill exactly.
produces: |
  A Playwright TypeScript project with:
  - Strict Page Object Model (every page extends BasePage)
  - Single-barrel imports through src/config/page-loader.ts
  - Fluent chaining (every step_/verify_ method returns Promise<this>)
  - JSON-backed test data consumed via typed module imports
  - No custom logger, no method decorator, no globalSetup, no auth-storage files
prerequisites:
  runtime:
    - Node.js >= 20
    - npm
  configuration:
    - .env file containing BASE_URL=<target_app_url>
non_goals:
  - API testing (this skill is UI-only)
  - Cross-browser matrix (chromium-only by default)
anchors:
  contract:    "#sec-contract"
  bootstrap:   "#sec-bootstrap"
  rules:       "#sec-rules"
  layout:      "#sec-layout"
  config:      "#sec-config"
  framework:   "#sec-framework"
  page-object: "#sec-page-object"
  panel:       "#sec-panel"
  data:        "#sec-data"
  spec:        "#sec-spec"
  naming:      "#sec-naming"
  decisions:   "#sec-decisions"
  mapping:     "#sec-mapping"
  worked:      "#sec-worked"
  add-feature: "#sec-add-feature"
  anti:        "#sec-anti"
  validate:    "#sec-validate"
---

# Playwright Page-Object Test Suite Skill

> **Resource self-description.** This is a complete, standalone authoring standard for Playwright UI tests in the page-object style. A tester who has never seen the reference codebase MUST be able to read this file, plus a `.env` containing `BASE_URL` and a list of natural-language scenarios, and produce a project that matches this skill exactly. The non-negotiable rules and templates are normative; example names (`LoginPage`, `users.admin`) are illustrative — substitute for the target application.

---

## 0. Application contract <a id="sec-contract"></a>

Code produced under this skill MUST satisfy all of:

- **C1.** Every page class extends `BasePage` (defined in §[framework](#sec-framework)).
- **C2.** Every action method is named `step_<verb>`; every assertion method is named `verify_<thing>`. Both are `async` and return `Promise<this>`.
- **C3.** Every spec file has exactly two `import` lines: `test` from `src/config/page.config`, plus barrel imports from `src/config/page-loader`. No deep imports into `src/`.
- **C4.** `src/config/page-loader.ts` contains only single-line `export ... from '...'` statements. No `import` plus derived `export const` patterns.
- **C5.** Every page object accessed in a test is provided as a Playwright fixture in `src/config/page.config.ts`. Tests never call `new <Page>(page)` directly.
- **C6.** All test data is JSON under `src/data/<feature>/`, imported via the barrel as the file's own top-level shape (no wrapper objects, no runtime loaders).
- **C7.** No custom logger, no method decorator, no `globalSetup`, no `authenticatedPage` fixture, no `DataLoader` / `CredentialResolver` classes. (See §[anti](#sec-anti).)
- **C8.** Fixture destructure lists and any function parameter list stay on a single line — never broken vertically.
- **C9.** The only secret/configuration source is `.env`. Read via `process.env.X`. No hardcoded URLs or credentials in code.
- **C10.** `npm run audit` (`tsc --noEmit`) returns clean, and the validation recipes in §[validate](#sec-validate) all pass.

A piece of code that violates any contract clause does not conform.

---

## 1. Bootstrap from an empty directory <a id="sec-bootstrap"></a>

Run these commands top-to-bottom in an empty folder. They produce a runnable shell — scenario-specific files come later (§[mapping](#sec-mapping), §[worked](#sec-worked)).

### 1.1 Commands

```bash
mkdir <project-name> && cd <project-name>
npm init -y
npm install -D @playwright/test typescript @types/node dotenv
npx playwright install chromium
mkdir -p src/config src/data src/gui/pages src/gui/panels features
```

### 1.2 `.env` (root)

```
BASE_URL=https://your-target-app.example.com
```

`.env` is the **only** source of environment-specific config. If the target requires credentials that must not be committed, add them here too (e.g. `ADMIN_PASSWORD=...`) and read via `process.env.X` at the consumption site.

### 1.3 `.gitignore` (root)

```
# ── Node / build ──────────────────────────────────────────────
node_modules

# ── Playwright outputs ────────────────────────────────────────
test-results
playwright-report

# ── Environment / secrets ─────────────────────────────────────
.env
.env.*
!.env.example
auth/

# ── Logs ──────────────────────────────────────────────────────
*.log
```

### 1.4 `package.json` (root)

Replace what `npm init -y` produced with:

```json
{
  "name": "<project-name>",
  "version": "1.0.0",
  "description": "Playwright UI Test Automation",
  "scripts": {
    "ui:headed":   "playwright test --headed --project=chromium --workers=1 --trace on",
    "ui:headless": "playwright test --project=chromium",
    "ui:debug":    "playwright test --debug",
    "clean":       "node -e \"const fs=require('fs'); ['test-results','playwright-report'].forEach(d => fs.rmSync(d,{recursive:true,force:true})); console.log('cleaned');\"",
    "audit":       "tsc --noEmit"
  },
  "devDependencies": {
    "@playwright/test": "^1.55.1",
    "@types/node":       "^24.6.0",
    "typescript":        "^5.9.3",
    "dotenv":            "^17.3.1"
  }
}
```

### 1.5 Create root config files

Create `tsconfig.json` and `playwright.config.ts` in the project root using the verbatim contents of §[config](#sec-config).

### 1.6 Create framework files

Create the three framework files using the verbatim contents of §[framework](#sec-framework):

- `src/config/page-loader.ts`
- `src/config/page.config.ts`
- `src/gui/pages/BasePage.ts`

At first creation, `page-loader.ts` and `page.config.ts` will reference page objects you have not built yet — that is expected. Each new page added in §[mapping](#sec-mapping) appends one line to each.

### 1.7 Sanity check

```bash
npm run audit
```

Must pass before writing any feature code. If it fails, the framework files are wrong — re-copy from §[framework](#sec-framework).

---

## 2. Non-negotiable rules <a id="sec-rules"></a>

1. **Pages extend `BasePage`.** No exceptions.
2. **Pages and panels return `Promise<this>`** from every `step_*` and `verify_*` method, except read getters that return data.
3. **Method names are prefixed.** `step_*` for actions. `verify_*` for assertions.
4. **Tests live only in `features/`.** Never `tests/`, `specs/`, or `__tests__/`.
5. **Spec files have exactly two imports.** `test` from `page.config`, everything else from `page-loader`.
6. **`page-loader.ts` is the only barrel.** Single-line `export ... from '...'` statements only — no `import` plus derived `export const`.
7. **Test data is JSON under `src/data/<feature>/`.** Specs consume it via the barrel; never `fs` or a runtime loader.
8. **Configuration comes from `.env`.** No hardcoded URLs or credentials in code.
9. **Fixtures construct page objects.** Tests destructure them — never `new PageObject(page)` inside a test.
10. **Single-line parameter lists.** Fixture destructure (`async ({ a, b, c, d, e }) => {`) and any other function parameter list stay on one line, no matter how long. Multi-line vertical layouts of parameters are forbidden.
11. **No custom logger, no `@step` decorator, no global-setup.** Use Playwright's reporters and `await test.step(...)` if you need observable steps.

---

## 3. Project layout <a id="sec-layout"></a>

```
project-root/
├── .env                            # BASE_URL and any feature-specific secrets
├── .gitignore
├── playwright.config.ts
├── tsconfig.json
├── package.json
├── PLAYWRIGHT-SKILL.md             # this file
│
├── src/
│   ├── config/
│   │   ├── page-loader.ts          # single barrel: pages + panels + JSON data
│   │   └── page.config.ts          # extends Playwright `test` with page-object fixtures
│   │
│   ├── data/
│   │   └── <feature>/              # one folder per feature
│   │       ├── users.json          # only for features that need credentials
│   │       └── expected.json       # expected UI text / labels / errors
│   │
│   └── gui/
│       ├── pages/
│       │   ├── BasePage.ts         # do not modify casually
│       │   └── <Feature>Page.ts    # one file per application page
│       └── panels/
│           └── <Name>Panel.ts      # reusable composed UI region (e.g. header)
│
└── features/
    └── <feature>.spec.ts           # one file per feature; uses fixtures only
```

**Folder names are fixed.** **File names** are PascalCase for classes (`LoginPage.ts`), kebab-case for non-class config files (`page-loader.ts`), lowercase for data folders (`login/`).

---

## 4. Root config files <a id="sec-config"></a>

### 4.1 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "types": ["node", "@playwright/test"],
    "ignoreDeprecations": "5.0",
    "baseUrl": ".",
    "paths": {
      "@pages/*":  ["src/gui/pages/*"],
      "@panels/*": ["src/gui/panels/*"],
      "@config/*": ["src/config/*"],
      "@gui/*":    ["src/gui/*"],
      "@src/*":    ["src/*"]
    }
  },
  "include": ["src/**/*", "features/**/*", "playwright.config.ts"],
  "exclude": ["node_modules"]
}
```

`resolveJsonModule` is required. **Do not** add `experimentalDecorators`, `emitDecoratorMetadata`, or a `@data/*` alias.

### 4.2 `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './features',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  outputDir: './test-results/runs',
  preserveOutput: 'failures-only',

  reporter: [
    ['html',  { outputFolder: 'test-results/html-report', open: 'never' }],
    ['json',  { outputFile: 'test-results/results.json' }],
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
    { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--no-sandbox'] } } },
  ],
});
```

**Do not** set `globalSetup`. **Do not** set project-level `storageState`. Auth happens inline inside tests that need it.

---

## 5. Framework files <a id="sec-framework"></a>

### 5.1 `src/config/page-loader.ts` (barrel)

Single-line re-exports only. When new pages, panels, or JSON data are added, append a line.

```ts
// ── Page Objects ─────────────────────────────────────────────
export { LoginPage }     from '../gui/pages/LoginPage';
export { DashboardPage } from '../gui/pages/DashboardPage';

// ── Panels ───────────────────────────────────────────────────
export { HeaderPanel } from '../gui/panels/HeaderPanel';

// ── Test Data ────────────────────────────────────────────────
export { default as users }             from '../data/login/users.json';
export { default as loginExpected }     from '../data/login/expected.json';
export { default as dashboardExpected } from '../data/dashboard/expected.json';
```

On a fresh project, comment out the example lines until those files exist, or start with an empty barrel and append as features are added.

### 5.2 `src/config/page.config.ts` (fixtures)

One fixture per page object. Fixtures only wrap `new <PageObject>(page)` — no auth, no setup logic.

```ts
import { test as base, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { LoginPage, DashboardPage } from '@config/page-loader';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

type MyFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

const test = base.extend<MyFixtures>({
  loginPage:     async ({ page }, use) => { await use(new LoginPage(page)); },
  dashboardPage: async ({ page }, use) => { await use(new DashboardPage(page)); },
});

export { test, expect };
```

### 5.3 `src/gui/pages/BasePage.ts`

```ts
import { Page, Locator, TestInfo } from '@playwright/test';

export class BasePage {
  protected page: Page;

  constructor(page: Page) { this.page = page; }

  async waitForPageLoad(): Promise<this> {
    await this.page.waitForLoadState('domcontentloaded');
    return this;
  }

  async waitForElement(locator: Locator, timeout = 10000): Promise<this> {
    await locator.waitFor({ state: 'visible', timeout });
    return this;
  }

  async getTitle(): Promise<string> { return this.page.title(); }

  async attachScreenshot(testInfo: TestInfo, name = 'screenshot'): Promise<void> {
    const screenshot = await this.page.screenshot({ fullPage: true });
    await testInfo.attach(name, { body: screenshot, contentType: 'image/png' });
  }
}
```

---

## 6. Page object template <a id="sec-page-object"></a>

> **Example, substitute names and selectors.** The structure (locators block → `step_*` block → `verify_*` block, all returning `this`) is normative.

```ts
import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
// import composed panels via @panels alias when needed

export type LoginCredentials = { username: string; password: string };  // colocate small data shapes here

export class LoginPage extends BasePage {
  readonly path = '/web/index.php/auth/login';

  // 1. Locators — private fields, declared at class scope
  private usernameInput = this.page.locator('input[name="username"]');
  private passwordInput = this.page.locator('input[name="password"]');
  private loginButton   = this.page.locator('button[type="submit"]');
  private errorMessage  = this.page.locator('.oxd-alert-content-text');

  constructor(page: Page) { super(page); }

  // 2. step_* methods — actions
  async step_navigate(): Promise<this> {
    await this.page.goto(this.path);
    await this.waitForPageLoad();
    return this;
  }

  async step_login(credentials: LoginCredentials): Promise<this> {
    await this.usernameInput.fill(credentials.username);
    await this.passwordInput.fill(credentials.password);
    await this.loginButton.click();
    await this.waitForPageLoad();
    return this;
  }

  // 3. verify_* methods — assertions
  async verify_errorMessage(expectedText: string): Promise<this> {
    await this.errorMessage.waitFor({ state: 'visible' });
    expect((await this.errorMessage.innerText()).trim()).toContain(expectedText);
    return this;
  }
}
```

**Allowed deviations:** locator selectors and `path` change per application. Class layout, inheritance, and `Promise<this>` return type do not.

---

## 7. Panel template <a id="sec-panel"></a>

Panels are **composed**, not extended. They receive `page` and own a slice of locators. Hold an instance on a page object: `readonly topNav = new HeaderPanel(this.page);`.

```ts
import { Page, Locator } from '@playwright/test';

export class HeaderPanel {
  private profileBadge: Locator;
  private profileName:  Locator;

  constructor(private page: Page) {
    this.profileBadge = page.locator('.oxd-userdropdown');
    this.profileName  = page.locator('.oxd-userdropdown-name');
  }

  async getProfileName(): Promise<string> {
    await this.profileName.waitFor({ state: 'visible' });
    return (await this.profileName.innerText()).trim();
  }

  async openProfileMenu(): Promise<this> {
    await this.profileBadge.click();
    return this;
  }
}
```

---

## 8. JSON data templates <a id="sec-data"></a>

The JSON file's top-level keys are the data the spec consumes — **no wrapper objects.** `_comment` is allowed and ignored at runtime.

### 8.1 Credentials — `users.json`

```json
{
  "_comment": "Test user credentials.",
  "admin":   { "username": "Admin", "password": "admin123" },
  "invalid": { "username": "invalid_user", "password": "wrong_password" }
}
```

Spec usage: `import { users } from '...'; users.admin`

### 8.2 Expected values — `expected.json`

```json
{
  "_comment": "Expected UI text for <feature> assertions.",
  "errors": { "invalidCredentials": "Invalid credentials" },
  "labels": { "pageTitle": "OrangeHRM" }
}
```

Spec usage: `import { loginExpected as expected } from '...'; expected.errors.invalidCredentials`

**Barrel re-export naming for `expected.json`:** `<feature>Expected` (e.g., `loginExpected`, `dashboardExpected`, `paymentsExpected`). Specs alias to `expected` at the import line.

---

## 9. Spec template <a id="sec-spec"></a>

```ts
import { test } from '../src/config/page.config';
import { users, loginExpected as expected } from '../src/config/page-loader';

test.describe('<App-or-Feature> - <Area>', () => {
  test('<should do observable thing>', async ({ loginPage, dashboardPage }) => {
    await loginPage.step_navigate();
    await loginPage.step_login(users.admin);
    await dashboardPage.verify_onDashboard();
    await dashboardPage.verify_pageTitle(expected.labels.pageTitle);
  });
});
```

**Spec rules:**
- Exactly two import lines: `test` from `page.config`, plus barrel imports.
- Alias the matching `<feature>Expected` to `expected` at the import line.
- Do **not** destructure data into local consts (`const { users } = ...`). The barrel exposes the shape directly.
- Do **not** call `expect` directly in a test body. Wrap assertions inside `verify_*` methods on page objects.
- Do **not** call `new <Page>(...)` inside a test. Add a fixture if one is missing.
- **Single-line fixture destructure.** Even when long:
  - ✅ `async ({ loginPage, dashboardPage, paymentsPage, profilePage, settingsPage }) => {`
  - ❌
    ```ts
    async ({
      loginPage,
      dashboardPage,
      paymentsPage,
    }) => {
    ```

---

## 10. Naming & style <a id="sec-naming"></a>

- **Class names:** PascalCase, suffix `Page` or `Panel`.
- **Method names:** `step_<verbPhrase>` or `verify_<thing>`. Snake-prefix is intentional — groups behavior in IDE autocomplete.
- **File names:** match the class name verbatim (`LoginPage.ts`).
- **Locator fields:** `private`, camelCase, suffix matches the element kind (`usernameInput`, `loginButton`, `errorMessage`).
- **Blank lines:** one blank line between method groups (locators / `step_` / `verify_`).
- **Always `await`** Playwright calls. Never chain promise methods (`.then(...)`) in tests.
- **Spec describe titles:** `'<App-or-Feature> - <Area>'`.
- **Spec test titles:** start with `should <observable behavior>`.
- **Horizontal parameter lists.** Fixture destructure, method signatures, and constructor parameter lists stay on a single line — even when the list grows. Multi-line vertical layouts of parameters are forbidden.

---

## 11. Decision rules <a id="sec-decisions"></a>

| Question | Rule |
|---|---|
| New utility shared across multiple pages — `BasePage` or page object? | `BasePage` only if it's selector-agnostic and applies to *every* page. If it touches a specific element shape, it belongs in a page object or panel. |
| Reusable UI region appears on multiple pages — page or panel? | Panel. Pages own URLs and lifecycles; panels own a region of DOM. |
| New data structure — type, JSON, or barrel? | Static test data → JSON under `src/data/<feature>/`. Tiny shape used only by one page object → exported `type` colocated in that file. Never invent a "wrapper" interface for a JSON shape. |
| Need to log in for a test — global state or inline? | Always inline via `loginPage.step_login(...)`. Do not add `globalSetup`, `storageState` files, or an `authenticatedPage` fixture. |
| Want collapsible steps in the HTML reporter? | Use Playwright's native `await test.step('...', async () => { ... })` inside the page object method. Do not introduce a method decorator. |
| New env var? | Add to `.env`, read via `process.env.X`. Do not introduce a config wrapper class. |
| Test needs to assert something not on a page object yet? | Add a `verify_*` method to the page object first, then call it from the test. No bare `expect(...)` in the spec body. |
| Fixture destructure list grew long, want to wrap to multiple lines? | No. Keep it horizontal. If it really feels too long, the test is doing too much — split into smaller tests rather than reformatting. |

---

## 12. Scenario → code mapping <a id="sec-mapping"></a>

Given a natural-language scenario, derive the file set deterministically.

### 12.1 Vocabulary

| Scenario phrase | Maps to |
|---|---|
| "the login page", "the dashboard", "the payments screen" | A **page object**: `LoginPage`, `DashboardPage`, `PaymentsPage`. One page = one class. |
| "the header", "the side menu", "the footer" (appears on multiple pages) | A **panel**: `HeaderPanel`, `SideMenuPanel`, `FooterPanel`. |
| "user clicks", "user fills", "user navigates", "user submits" | A **`step_*` method** on the page or panel that owns the affected element. |
| "user sees", "is shown", "verify", "should display", "expect" | A **`verify_*` method** on the page or panel that owns the asserted element. |
| "as <role>" / "as <user-type>" credentials | An entry in the feature's `users.json` (`admin`, `invalid`, `customer`, …). |
| Concrete UI text the test asserts ("Invalid credentials", "Welcome, Admin") | A field in the feature's `expected.json` under `errors`, `labels`, or `messages`. |
| "given …, when …, then …" Gherkin shape | Tests are written as plain Playwright `test(...)` blocks; phases become a sequence of `step_*` calls followed by `verify_*` calls. |

### 12.2 Derivation rules

For each scenario:

1. **Pick a feature name.** Use the noun the scenario centers on (`login`, `dashboard`, `payments`). Lowercase, kebab-case if multi-word.
2. **Identify pages touched.** Each distinct screen = a page object class named `<Feature>Page` (PascalCase + `Page`).
3. **Identify shared regions.** Anything visible on more than one page = a panel `<Name>Panel`.
4. **Identify data:**
   - Credentials → `src/data/<feature>/users.json` with one key per user role.
   - Expected text → `src/data/<feature>/expected.json` keyed by `errors`, `labels`, or `messages`.
5. **Map verbs to methods:** every action verb in the scenario → a `step_<verb>` method on the relevant page; every "see/verify/expect" → a `verify_<thing>` method.
6. **Wire into the framework:**
   - Append page-object re-export to `src/config/page-loader.ts`.
   - Append `<feature>Expected` JSON re-export to `page-loader.ts`.
   - Append fixture entry to `src/config/page.config.ts` (type + wrapper).
7. **Write the spec:** one `<feature>.spec.ts` in `features/`. One `test.describe` per feature, one `test(...)` per scenario.

### 12.3 Naming derivations

| Concept | From feature name `payments` |
|---|---|
| Folder | `src/data/payments/` |
| Page class & file | `PaymentsPage` in `src/gui/pages/PaymentsPage.ts` |
| Fixture key (camelCase) | `paymentsPage` |
| Barrel data export | `paymentsExpected` (and optional `paymentsUsers`, but typically just `users` if only one feature has credentials) |
| Spec file | `features/payments.spec.ts` |
| Spec describe title | `'<App> - Payments'` |

---

## 13. Worked example: from scenarios to passing tests <a id="sec-worked"></a>

Inputs the tester is given:

```
.env:
  BASE_URL=https://demo.app.example.com

Scenarios:
  1. As an admin, when I log in with valid credentials, I land on the dashboard
     and see my profile name in the header.
  2. When I log in with invalid credentials, I see the error "Invalid credentials".
```

### 13.1 Derive

- Feature names: `login`, `dashboard`.
- Pages: `LoginPage`, `DashboardPage`.
- Panel (header appears on dashboard, will appear on others): `HeaderPanel`.
- Data:
  - `src/data/login/users.json` — keys `admin`, `invalid`.
  - `src/data/login/expected.json` — `errors.invalidCredentials`.
  - `src/data/dashboard/expected.json` — `labels.pageTitle`.
- Methods:
  - `LoginPage.step_navigate`, `step_login(credentials)`, `verify_errorMessage(text)`.
  - `DashboardPage.step_navigate`, `verify_onDashboard()`, `verify_pageTitle(text)`, `verify_profileName()`.
  - `HeaderPanel.getProfileName()`.

### 13.2 Files to create

In order:

1. `src/data/login/users.json` — see §[data](#sec-data).
2. `src/data/login/expected.json` — see §[data](#sec-data).
3. `src/data/dashboard/expected.json` — see §[data](#sec-data).
4. `src/gui/panels/HeaderPanel.ts` — see §[panel](#sec-panel).
5. `src/gui/pages/LoginPage.ts` — see §[page-object](#sec-page-object).
6. `src/gui/pages/DashboardPage.ts` — same shape as §[page-object](#sec-page-object), composing `HeaderPanel`.
7. `src/config/page-loader.ts` — append page-object, panel, and JSON re-exports.
8. `src/config/page.config.ts` — add `loginPage` and `dashboardPage` fixtures.
9. `features/login.spec.ts`:
   ```ts
   import { test } from '../src/config/page.config';
   import { users, loginExpected as expected } from '../src/config/page-loader';

   test.describe('Demo App - Login', () => {
     test('should log in successfully and verify profile name', async ({ loginPage, dashboardPage }) => {
       await loginPage.step_navigate();
       await loginPage.step_login(users.admin);
       await dashboardPage.verify_onDashboard();
       await dashboardPage.verify_profileName();
     });

     test('should show error for invalid credentials', async ({ loginPage }) => {
       await loginPage.step_navigate();
       await loginPage.step_login(users.invalid);
       await loginPage.verify_errorMessage(expected.errors.invalidCredentials);
     });
   });
   ```
10. `features/dashboard.spec.ts` if dashboard scenarios stand alone, otherwise combine into `login.spec.ts`.

### 13.3 Verify

Run §[validate](#sec-validate). All checks must pass.

---

## 14. Add-a-feature checklist <a id="sec-add-feature"></a>

For each new feature `<feature>` with page `<Feature>Page`:

1. `src/data/<feature>/expected.json` — keys grouped by `errors`/`labels`/`messages`. Add `users.json` only if new credentials are needed.
2. `src/gui/pages/<Feature>Page.ts` — extend `BasePage`; methods follow §[page-object](#sec-page-object).
3. `src/config/page-loader.ts` — append page-object re-export and `<feature>Expected` JSON re-export. Single-line exports only.
4. `src/config/page.config.ts` — add `<feature>Page: <Feature>Page` to fixture type and one fixture wrapper.
5. `features/<feature>.spec.ts` — follow §[spec](#sec-spec). Use `<feature>Expected as expected`.
6. Run `npm run audit` — must pass.
7. Run `npm run ui:headless` — must pass.
8. Run validation recipes in §[validate](#sec-validate) — all must pass.

If any step requires touching `BasePage.ts`, stop and reconsider — the change probably belongs in the page object.

---

## 15. Anti-patterns — DO NOT introduce <a id="sec-anti"></a>

Each line is a grep target for §[validate](#sec-validate). Reintroducing any of these is a regression.

- Custom logger functions (`logSuite`, `logTest`, `logField`, `logUrl`, `logSep`, `logSuccess`).
- A `@step` method decorator wrapping `console.log`. Use `await test.step(...)` instead.
- A `global-setup.ts` that pre-authenticates and saves `storageState`. Log in inline.
- A runtime `DataLoader` class reading JSON via `fs.readFileSync`. Use `import` with `resolveJsonModule`.
- A `CredentialResolver` class wrapping `users.json`. Specs read `users.<key>` from the barrel directly.
- An `authenticatedPage` fixture wrapping `browser.newContext({ storageState })`. Log in inside the test.
- Wrapper interfaces over JSON shapes (`LoginExpectedFile`, `LoginUsersFile`, etc.). Type inference from `resolveJsonModule` is sufficient.
- A `@data/*` path alias. Test data flows only via the barrel.
- `experimentalDecorators` / `emitDecoratorMetadata` in `tsconfig.json`.
- Destructuring barrel data into local consts at the top of a spec (`const { users } = ...`).
- Direct `expect(...)` calls in spec bodies.
- **Multi-line / vertical parameter lists.** Fixture destructures and function signatures stay on one line, regardless of length.

---

## 16. Validation recipes <a id="sec-validate"></a>

Run after any change. Cheap; use them to self-check.

### 16.1 Type check

```bash
npm run audit
```

Must exit `0` with no diagnostics.

### 16.2 Anti-pattern grep

```bash
# Each must return zero hits
grep -rn "logSep\|logField\|logUrl\|logSuccess\|logSuite\|logTest" src features
grep -rn "@step\b\|class .*Decorator\b" src features
grep -rn "DataLoader\|CredentialResolver" src features
grep -rn "authenticatedPage\|globalSetup" src features playwright.config.ts
grep -rn "experimentalDecorators\|emitDecoratorMetadata" tsconfig.json
grep -rn "@data/" src features tsconfig.json
```

### 16.3 Spec import discipline

```bash
for f in features/*.spec.ts; do
  echo "$f: $(grep -c '^import ' "$f") imports"
done
```

Every spec must report `2 imports`.

### 16.4 Method-naming discipline

```bash
grep -rn "^\s*async \([a-z][a-zA-Z]*\)" src/gui | grep -v "step_\|verify_\|get[A-Z]\|wait[A-Z]\|attach[A-Z]\|open[A-Z]"
```

Should return zero hits.

### 16.5 Horizontal-parameter-list check

```bash
# Catches fixture destructures broken across lines
grep -rn "async ({\s*$" src features
# Catches method signatures opened with `(` and broken across lines
grep -rn "(\s*$" src/gui features
```

Should return zero hits.

### 16.6 Runtime smoke

```bash
npm run ui:headless
```

Full suite must pass against `BASE_URL`. Only check that requires a live target.

A skill application that fails any of §16.1–16.5 is non-conforming regardless of whether §16.6 passes.

---

## 17. Versioning & change policy

- **Breaking changes** to §[contract](#sec-contract) or §[rules](#sec-rules) bump the major version.
- **Additive changes** (new templates, new decision rules, new validation recipes) bump the minor version.
- **Editorial changes** update only the `updated:` date.
- §[anti](#sec-anti) is append-only — once a pattern is forbidden, future versions do not re-permit it without a major bump.

When this skill is consumed via an MCP server in `resources` mode, the server SHOULD expose `version` and `updated` from the frontmatter as resource metadata so consumers detect drift between cached and fresh fetches. Clients SHOULD treat the file as a single resource (fragment anchors in §[anchors](#sec-contract) only — no sub-resources).
