# ordino-gui-pw-project

Playwright UI test automation — TypeScript, Page Object Model, fluent chaining, auth state reuse.

---

## Project Structure

```
ordino-gui-pw-project/
├── .env                                    # Environment variables (BASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD)
├── playwright.config.ts                    # Playwright configuration
├── tsconfig.json                           # TypeScript compiler options + path aliases
├── package.json
├── PLAYWRIGHT-SKILL.md                     # AI agent + contributor reference guide
│
├── src/
│   ├── config/
│   │   ├── page-loader.ts                  # Barrel re-export for pages, panels, loaders, interfaces, decorators
│   │   ├── page.config.ts                  # Playwright fixtures (loginPage, dashboardPage, authenticatedPage)
│   │   ├── data/
│   │   │   ├── interfaces/
│   │   │   │   ├── index.ts
│   │   │   │   ├── common.interfaces.ts    # DataSet<T> generic type
│   │   │   │   ├── login.interfaces.ts     # LoginCredentials, LoginUsersFile, LoginExpectedFile
│   │   │   │   └── dashboard.interfaces.ts # DashboardExpectedFile
│   │   │   └── loaders/
│   │   │       ├── index.ts
│   │   │       ├── DataLoader.ts           # Generic JSON loader with in-memory cache
│   │   │       └── CredentialResolver.ts   # Resolves credentials from JSON + env override
│   │   └── utils/
│   │       ├── decorators.ts               # @step decorator + log utilities
│   │       ├── global-setup.ts             # One-time auth — saves admin session to admin.json
│   │       └── admin.json                  # Auto-generated — do not commit
│   │
│   ├── data/
│   │   ├── login/
│   │   │   ├── users.json                  # User credentials (admin, invalid)
│   │   │   └── expected.json               # Expected values for login assertions
│   │   └── dashboard/
│   │       └── expected.json               # Expected values for dashboard assertions
│   │
│   └── gui/
│       ├── pages/
│       │   ├── BasePage.ts                 # Shared utilities (waitForPageLoad, waitForElement, attachScreenshot)
│       │   ├── LoginPage.ts                # Login page actions and verifications
│       │   └── DashboardPage.ts            # Dashboard page verifications (composes HeaderPanel)
│       └── panels/
│           └── HeaderPanel.ts              # Reusable header/profile panel
│
└── features/
    ├── login.spec.ts                       # Login suite (2 tests)
    └── home.spec.ts                        # Dashboard suite — authenticated session (1 test)
```

---

## Installation

```bash
npm install
npx playwright install chromium
```

## Environment Setup

Create a `.env` file in the project root:

```bash
BASE_URL=https://opensource-demo.orangehrmlive.com
ADMIN_USERNAME=Admin
ADMIN_PASSWORD=admin123
```

All values default to the OrangeHRM demo instance if not set.

---

## Running Tests

| Command | Description |
|---|---|
| `npm run ui:headless` | Run all tests headlessly (CI-friendly) |
| `npm run ui:headed` | Run with visible browser, 1 worker |
| `npm run ui:debug` | Open Playwright Inspector for step-by-step debugging |
| `npm run clean` | Delete `test-results/`, `playwright-report/`, and `admin.json` |
| `npm run audit` | TypeScript type-check without emitting files |

---

## Key Design Decisions

### Page Object Model (POM)

Each page/panel is a class extending `BasePage`, constructed with a Playwright `Page` instance. Methods follow a strict naming convention:

- `step_*` — actions (navigate, fill, click)
- `verify_*` — assertions

All methods are `async` and return `Promise<this>` for fluent chaining:

```ts
await new LoginPage(page)
  .step_navigate()
  .then(p => p.step_login(credentials))
  .then(p => p.verify_onDashboard());
```

Methods decorated with `@step` from `decorators.ts` are automatically logged in the Playwright trace viewer.

### Reusable Panels

Shared UI sections (e.g. `HeaderPanel`) live in `src/gui/panels/` and are composed into page classes, not extended:

```ts
export class DashboardPage extends BasePage {
  readonly topNav = new HeaderPanel(this.page);
}
```

### Auth State Reuse

`global-setup.ts` runs **once** before the entire test suite. It logs in as admin and saves the browser context (cookies + localStorage) to `src/config/utils/admin.json`.

Tests needing a pre-authenticated session use the `authenticatedPage` fixture, which restores this saved state — no repeated logins per test.

Tests that explicitly test the login flow clear auth state:

```ts
test.use({ storageState: { cookies: [], origins: [] } });
```

### Fixtures (`page.config.ts`)

| Fixture | Type | Purpose |
|---|---|---|
| `authenticatedPage` | `Page` | Playwright page restored from saved admin auth state |
| `loginPage` | `LoginPage` | Fresh `LoginPage` instance for the current test |
| `dashboardPage` | `DashboardPage` | Fresh `DashboardPage` instance for the current test |

### Test Data

JSON files in `src/data/` hold credentials and expected values. `DataLoader` reads and caches them; `CredentialResolver` resolves user credentials with optional `.env` overrides for CI/CD:

```ts
const expected = DataLoader.load<LoginExpectedFile>('login/expected');
const credentials = CredentialResolver.getUser('admin');
```

### Reporters

| Reporter | Output |
|---|---|
| HTML | `test-results/html-report/index.html` |
| JSON | `test-results/results.json` |
| JUnit | `test-results/results.xml` |
| List | Terminal stdout |

---

## Dependencies

| Package | Purpose |
|---|---|
| `@playwright/test` | Test runner, browser automation, assertions |
| `dotenv` | Load `.env` into `process.env` |
| `typescript` | Type-safe JavaScript |
| `@types/node` | Node.js type definitions |
