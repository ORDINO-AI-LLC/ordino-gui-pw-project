---
# ── MCP resource metadata ─────────────────────────────────────
uri:         skill://playwright-page-object-suite
name:        playwright-page-object-suite
title:       Playwright Page-Object Test Suite Skill
mimeType:    text/markdown
version:     4.3.0
updated:     2026-05-03
license:     project-internal
description: |
  Self-contained authoring standard for Playwright TypeScript UI suites in
  strict page-object style. A tester with only a BASE_URL and natural-language
  scenarios can follow this skill end-to-end and produce a runnable suite that
  matches it exactly. Templates are normative; example names are illustrative.

# ── Trigger gate ──────────────────────────────────────────────
# Engage this skill ONLY when BOTH conditions hold:
#   1. The user message contains the mention `@ordino` (case-insensitive).
#   2. The intent matches one of `triggers.intents` below.
# A bare `@ordino` mention without a matching intent does NOT engage the skill.
# A matching intent without `@ordino` does NOT engage the skill.
triggers:
  mention: "@ordino"
  intents:
    - project_bootstrap        # scaffold a new Playwright suite from empty dir
    - add_feature              # add a page/panel/spec/JSON for a new feature
    - structure_audit          # check conformance to §1 contract / §15 anti
    - format_fix               # bring existing files in line with templates
    - capture_loop             # run §3 Chrome DevTools MCP capture
    - base_url_onboarding      # resolve / change BASE_URL per §0
    - smoke_verify             # run a sample test and observe pass per §17
  applies_to:
    - "scaffold|bootstrap|init|set up|new project|fresh repo"
    - "add (a )?(page|panel|spec|feature|fixture)"
    - "check (conformance|structure|format|anti-?pattern)"
    - "(rename|reformat|restructure) (page|spec|panel|fixture|barrel|loader)"
    - "capture (with )?(devtools|mcp|snapshot)"
    - "BASE_URL|base url"
  does_not_apply_to:
    - API / backend / non-UI tests
    - Questions about the app-under-test's business logic
    - Dependency upgrades that don't touch the skill's contract
    - General TS / Node / CI questions unrelated to the suite's structure
    - Anything @ordino-tagged but off-topic (e.g. weather, status, chat)
  on_mismatch: |
    If `@ordino` is present but the intent does not match, do NOT load this
    skill. Respond using the consumer's normal flow and, if the request is
    ambiguous, ask whether the user wants project-structure help.

inputs:
  - name:              BASE_URL
    required:          true
    source:            .env
    prompt_if_missing: true
    description:       Target web app URL. If `.env` is missing or has no
                       `BASE_URL=` line, the consumer MUST ask the user before
                       producing any artifact (see §0).

prerequisites:
  runtime: [Node.js >= 20, npm]
  tooling: [Chrome DevTools MCP]

non_goals: [API testing, cross-browser matrix]
---

# Playwright Page-Object Test Suite Skill

Single atomic resource. Frontmatter is metadata; `#sec-*` anchors are stable.

**Trigger gate.** Engage this skill only when the user message contains
`@ordino` AND the intent is project bootstrap, add-a-feature, structure /
format audit, capture-loop work, or BASE_URL onboarding (see frontmatter
`triggers`). A bare `@ordino` on an off-topic request (e.g. business-logic
questions, API tests, dependency bumps, chat) does NOT engage this skill —
fall back to the consumer's normal flow and ask for clarification if needed.

---

## 0. Resolve BASE_URL first <a id="sec-input"></a>

The skill is parameterized by exactly one input: `BASE_URL`.

1. **Read `.env`** at project root. If it has a non-empty `BASE_URL=…`, use it.
2. **Else ASK THE USER** via the consumer's user-question facility (e.g.
   `AskUserQuestion`) with one free-text prompt: *"What is the BASE_URL of the
   target web application?"* Write `BASE_URL=<answer>` to `.env` (creating it
   if needed). Do not guess or use a placeholder.
3. **Validate.** Must be `http(s)://…`. Reject bare hosts and re-prompt.

`.env` is the only source of `BASE_URL` and feature secrets. Hardcoded URLs or
credentials in TS source are an anti-pattern (§[anti](#sec-anti)).

---

## 1. Contract <a id="sec-contract"></a>

Code produced under this skill MUST satisfy all of:

- **C1.** Every page class extends `BasePage` (§[framework](#sec-framework)).
- **C2.** Action methods are `step_<verb>`; assertions are `verify_<thing>`.
  Both `async`, both return `Promise<this>` (read getters returning data are
  exempt).
- **C3.** Specs have exactly two imports: `test` from `src/config/page.config`
  + barrel imports from `src/config/page-loader`. No deep imports.
- **C4.** `src/config/page-loader.ts` contains only single-line
  `export … from '…'` statements.
- **C5.** Every page object used in a test is provided as a fixture in
  `src/config/page.config.ts`. Tests never call `new <Page>(page)`.
- **C6.** Test data is JSON under `src/data/<feature>/`, imported via the
  barrel as the file's own top-level shape — no wrapper objects, no runtime
  loaders.
- **C7.** No custom logger, no method decorator, no `globalSetup`, no
  `authenticatedPage` fixture, no `DataLoader` / `CredentialResolver` classes
  (§[anti](#sec-anti)).
- **C8.** Fixture destructures and any function parameter list stay on a
  single line — never broken vertically.
- **C9.** The only secret/configuration source is `.env`, read via
  `process.env.X`.
- **C10.** Tests live only in `features/`. Never `tests/`, `specs/`,
  `__tests__/`.
- **C11.** `npm run audit` (`tsc --noEmit`) is clean and §[validate](#sec-validate)
  recipes pass.
- **C12.** First page object and spec for any new `BASE_URL` are derived from
  a Chrome DevTools MCP snapshot per §[capture](#sec-capture) — selectors come
  from the a11y tree, not guesswork.
- **C13.** A build is not complete until the §[smoke](#sec-smoke) sample-test
  smoke verification passes — sample spec runs green headed AND headless on
  the live `BASE_URL`, with no retries masking flake.

Violating any clause is non-conformance.

---

## 2. Bootstrap from empty directory <a id="sec-bootstrap"></a>

```bash
mkdir <project-name> && cd <project-name>
npm init -y
npm install -D @playwright/test typescript @types/node dotenv
npx playwright install chromium
mkdir -p src/config src/data src/gui/pages src/gui/panels features
```

`.env` (root): `BASE_URL=<value resolved per §0>`

`.gitignore` (root):
```
node_modules
test-results
playwright-report
.env
.env.*
!.env.example
auth/
*.log
```

`package.json` scripts:
```json
{
  "scripts": {
    "ui:headed":   "playwright test --headed --project=chromium --workers=1 --trace on",
    "ui:headless": "playwright test --project=chromium",
    "ui:debug":    "playwright test --debug",
    "clean":       "node -e \"const fs=require('fs'); ['test-results','playwright-report'].forEach(d => fs.rmSync(d,{recursive:true,force:true})); console.log('cleaned');\"",
    "audit":       "tsc --noEmit"
  }
}
```

Then create root configs (§[config](#sec-config)) and framework files
(§[framework](#sec-framework)). On first creation, comment out lines in
`page-loader.ts` / `page.config.ts` that reference pages not yet built; append
as features land. Run `npm run audit` — must pass before any feature code.

---

## 3. Capture a domain via Chrome DevTools MCP <a id="sec-capture"></a>

The first page object and spec are derived from the live DOM — never invent
selectors.

**Loop:**

1. `mcp__chrome-devtools__new_page` → `url = ${BASE_URL}` (or the app's entry
   route).
2. `mcp__chrome-devtools__wait_for` on a visible text token (e.g.
   `["E-mail", "Password", "Login"]`).
3. `mcp__chrome-devtools__take_snapshot` — a11y tree with stable `uid`s.
   Primary artifact for selectors.
4. `mcp__chrome-devtools__take_screenshot` `fullPage: true` →
   `test-results/captures/<feature>.png` (disposable, do not commit).
5. *(optional)* `mcp__chrome-devtools__evaluate_script` returning
   `{ inputs, buttons, links }` to fill `name`/`id`/`placeholder`/`disabled`
   the a11y tree omits.
6. `mcp__chrome-devtools__close_page`.

**Snapshot → page-object mapping:**

| Snapshot node | Becomes |
|---|---|
| `textbox "E-mail address"` | `private emailInput = this.page.getByLabel('E-mail address');` |
| `textbox "Password"` | `private passwordInput = this.page.getByLabel('Password');` |
| `button "Login"` | `private loginButton = this.page.getByRole('button', { name: 'Login' });` |
| `link "Forgot Password?"` | `private forgotPasswordLink = this.page.getByRole('link', { name: 'Forgot Password?' });` |
| `RootWebArea "<Title>"` | `expected.labels.pageTitle = "<Title>"` |
| `button "X" disabled` | `verify_<x>ButtonDisabled()` asserting `expect(locator).toBeDisabled()` |

Rules: role + accessible name first, CSS last. Initial-state assertions
(disabled buttons, default focus) are first-class — ship the matching
`verify_*` immediately. Static text → `expected.json`, never inline in spec.

**First spec must cover** (a) a render check (navigate, `verify_pageTitle`,
`verify_<key-link>Visible`, `verify_<submit>ButtonDisabled`) and (b) a happy
path (`step_login(users.admin)`, `verify_loggedIn`). Negative paths come from
a second snapshot pass after triggering the failure state.

**Re-capture** when a locator starts failing, when a new page is added, or
when `BASE_URL` is repointed.

---

## 4. Project layout <a id="sec-layout"></a>

```
project-root/
├── .env                            # BASE_URL and feature secrets
├── .gitignore
├── playwright.config.ts
├── tsconfig.json
├── package.json
│
├── src/
│   ├── config/
│   │   ├── page-loader.ts          # single barrel: pages + panels + JSON
│   │   └── page.config.ts          # extends `test` with page-object fixtures
│   ├── data/
│   │   └── <feature>/
│   │       ├── users.json          # only if credentials needed
│   │       └── expected.json
│   └── gui/
│       ├── pages/{BasePage.ts, <Feature>Page.ts}
│       └── panels/<Name>Panel.ts
│
└── features/<feature>.spec.ts
```

Folder names are fixed. Files: PascalCase for classes, kebab-case for config
files, lowercase for data folders.

---

## 5. Root config files <a id="sec-config"></a>

### 5.1 `tsconfig.json`

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
    "ignoreDeprecations": "6.0",
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

`resolveJsonModule` required. Do NOT add `experimentalDecorators`,
`emitDecoratorMetadata`, or `@data/*`.

### 5.2 `playwright.config.ts`

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

Do NOT set `globalSetup` or project-level `storageState`. Auth happens inline.

---

## 6. Framework files <a id="sec-framework"></a>

### 6.1 `src/config/page-loader.ts`

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

Single-line re-exports only. Append one line per new page/panel/JSON.

### 6.2 `src/config/page.config.ts`

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

Fixtures only wrap `new <PageObject>(page)` — no auth, no setup logic.

### 6.3 `src/gui/pages/BasePage.ts`

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

## 7. Page object template <a id="sec-page-object"></a>

Structure (locators → `step_*` → `verify_*`, all returning `this`) is
normative. Selectors and `path` change per app.

```ts
import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export type LoginCredentials = { username: string; password: string };

export class LoginPage extends BasePage {
  readonly path = '/web/index.php/auth/login';

  private usernameInput = this.page.locator('input[name="username"]');
  private passwordInput = this.page.locator('input[name="password"]');
  private loginButton   = this.page.locator('button[type="submit"]');
  private errorMessage  = this.page.locator('.oxd-alert-content-text');

  constructor(page: Page) { super(page); }

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

  async verify_errorMessage(expectedText: string): Promise<this> {
    await this.errorMessage.waitFor({ state: 'visible' });
    expect((await this.errorMessage.innerText()).trim()).toContain(expectedText);
    return this;
  }
}
```

---

## 8. Panel template <a id="sec-panel"></a>

Panels are **composed**, not extended. Held on a page object as
`readonly topNav = new HeaderPanel(this.page);`.

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

## 9. JSON data templates <a id="sec-data"></a>

Top-level keys are the data the spec consumes — no wrapper objects.
`_comment` is allowed and ignored at runtime.

`users.json`:
```json
{
  "_comment": "Test user credentials.",
  "admin":   { "username": "Admin", "password": "admin123" },
  "invalid": { "username": "invalid_user", "password": "wrong_password" }
}
```

`expected.json`:
```json
{
  "_comment": "Expected UI text for <feature> assertions.",
  "errors": { "invalidCredentials": "Invalid credentials" },
  "labels": { "pageTitle": "OrangeHRM" }
}
```

Spec usage: `import { users } from '...'; users.admin` and
`import { loginExpected as expected } from '...'; expected.errors.invalidCredentials`.

Barrel re-export naming: `<feature>Expected` (`loginExpected`,
`dashboardExpected`, `paymentsExpected`). Specs alias to `expected`.

---

## 10. Spec template <a id="sec-spec"></a>

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

Spec rules:
- Exactly two import lines.
- Alias `<feature>Expected` to `expected` at the import line.
- Do NOT destructure barrel data into local consts.
- Do NOT call `expect` directly in a test body.
- Do NOT `new <Page>(...)` inside a test — add a fixture.
- Single-line fixture destructure, even when long.
  - ✅ `async ({ loginPage, dashboardPage, paymentsPage, profilePage }) => {`
  - ❌ multi-line vertical destructure.

---

## 11. Naming & style <a id="sec-naming"></a>

- **Classes:** PascalCase, suffix `Page` or `Panel`.
- **Methods:** `step_<verbPhrase>` or `verify_<thing>`. Snake-prefix groups
  behavior in IDE autocomplete.
- **Files:** match class name (`LoginPage.ts`); kebab-case for config files.
- **Locator fields:** `private`, camelCase, suffix matches element kind
  (`usernameInput`, `loginButton`, `errorMessage`).
- **Blank lines:** one between method groups (locators / `step_` / `verify_`).
- **Always `await`** Playwright calls. No `.then(...)`.
- **Describe titles:** `'<App-or-Feature> - <Area>'`. **Test titles** start
  with `should <observable behavior>`.
- **Horizontal parameter lists.** Always.

---

## 12. Decision rules <a id="sec-decisions"></a>

| Question | Rule |
|---|---|
| `BasePage` or page object? | `BasePage` only if selector-agnostic and used by *every* page. |
| Page or panel? | Pages own URLs and lifecycles; panels own a region of DOM (reused on multiple pages). |
| New data — type, JSON, or barrel? | Test data → JSON. Tiny shape used by one page → exported `type` colocated. Never wrap a JSON shape. |
| Need to log in — global or inline? | Always inline via `loginPage.step_login(...)`. |
| Want collapsible reporter steps? | `await test.step('...', async () => { ... })`. Never a method decorator. |
| New env var? | `.env` + `process.env.X`. No config wrapper class. |
| Assert something not on a page object? | Add a `verify_*` first; no bare `expect(...)` in spec. |
| Fixture list feels long? | The test is doing too much — split it. Never wrap. |

---

## 13. Scenario → code mapping <a id="sec-mapping"></a>

| Phrase | Maps to |
|---|---|
| "the login page", "the dashboard" | A page object: `LoginPage`, `DashboardPage`. |
| "the header", "the side menu" (multi-page) | A panel: `HeaderPanel`, `SideMenuPanel`. |
| "user clicks/fills/navigates/submits" | `step_*` on the owning page/panel. |
| "user sees / verify / should display / expect" | `verify_*` on the owning page/panel. |
| "as <role>" credentials | An entry in `users.json` (`admin`, `invalid`, …). |
| Concrete asserted UI text | A field in `expected.json` under `errors`/`labels`/`messages`. |

**Per scenario:** (1) feature name = the central noun (lowercase, kebab-case
if multi-word); (2) each screen → `<Feature>Page`; (3) shared regions →
`<Name>Panel`; (4) credentials → `users.json`, expected text →
`expected.json`; (5) verbs → `step_*`, "see/verify" → `verify_*`; (6) wire via
`page-loader.ts` and `page.config.ts`; (7) one `<feature>.spec.ts` in
`features/`.

**Naming derivation from feature `payments`:**

| Concept | Value |
|---|---|
| Folder | `src/data/payments/` |
| Page class & file | `PaymentsPage` in `src/gui/pages/PaymentsPage.ts` |
| Fixture key | `paymentsPage` |
| Barrel data export | `paymentsExpected` |
| Spec file | `features/payments.spec.ts` |
| Describe title | `'<App> - Payments'` |

---

## 14. Add-a-feature checklist <a id="sec-add-feature"></a>

For new feature `<feature>` with page `<Feature>Page`:

1. `src/data/<feature>/expected.json` — keys grouped by
   `errors`/`labels`/`messages`. `users.json` only if new credentials needed.
2. `src/gui/pages/<Feature>Page.ts` — extend `BasePage`; follow
   §[page-object](#sec-page-object).
3. `src/config/page-loader.ts` — append page-object and `<feature>Expected`
   re-exports.
4. `src/config/page.config.ts` — add `<feature>Page: <Feature>Page` to
   fixture type and one fixture wrapper.
5. `features/<feature>.spec.ts` — follow §[spec](#sec-spec). Use
   `<feature>Expected as expected`.
6. `npm run audit` — must pass.
7. §[validate](#sec-validate) recipes — must pass.
8. §[smoke](#sec-smoke) sample-test smoke verification — pick the new spec as
   the sample and observe it pass headed and headless. Mandatory; no skipping.

If any step requires editing `BasePage.ts`, stop — the change probably belongs
in the page object.

---

## 15. Anti-patterns <a id="sec-anti"></a>

Each line is a grep target. Reintroducing any is a regression.

- Custom logger functions (`logSuite`, `logTest`, `logField`, `logUrl`,
  `logSep`, `logSuccess`).
- `@step` method decorator wrapping `console.log` — use `await test.step(...)`.
- `global-setup.ts` pre-authenticating to `storageState` — log in inline.
- Runtime `DataLoader` reading JSON via `fs.readFileSync` — use `import` with
  `resolveJsonModule`.
- `CredentialResolver` class — specs read `users.<key>` from the barrel.
- `authenticatedPage` fixture — log in inside the test.
- Wrapper interfaces over JSON shapes (`LoginExpectedFile`, etc.) — type
  inference is sufficient.
- `@data/*` path alias — test data flows only via the barrel.
- `experimentalDecorators` / `emitDecoratorMetadata` in `tsconfig.json`.
- Destructuring barrel data into local consts at the top of a spec.
- Direct `expect(...)` in spec bodies.
- Multi-line / vertical parameter lists.
- `bootstrap-check.mjs` runner or `bootstrap:check` script (removed v4.0 —
  `npm run audit` plus §[validate](#sec-validate) are the only gates).

---

## 16. Validation recipes <a id="sec-validate"></a>

```bash
# 16.1 Type check
npm run audit                                   # exit 0

# 16.2 Anti-pattern grep — each must return zero hits
grep -rn "logSep\|logField\|logUrl\|logSuccess\|logSuite\|logTest" src features
grep -rn "@step\b\|class .*Decorator\b" src features
grep -rn "DataLoader\|CredentialResolver" src features
grep -rn "authenticatedPage\|globalSetup" src features playwright.config.ts
grep -rn "experimentalDecorators\|emitDecoratorMetadata" tsconfig.json
grep -rn "@data/" src features tsconfig.json

# 16.3 Spec import discipline — every spec must report 2 imports
for f in features/*.spec.ts; do
  echo "$f: $(grep -c '^import ' "$f") imports"
done

# 16.4 Method-naming discipline — zero hits
grep -rn "^\s*async \([a-z][a-zA-Z]*\)" src/gui \
  | grep -v "step_\|verify_\|get[A-Z]\|wait[A-Z]\|attach[A-Z]\|open[A-Z]"

# 16.5 Horizontal-parameter-list — zero hits
grep -rn "async ({\s*$" src features
grep -rn "(\s*$" src/gui features

# 16.6 Runtime smoke — bare gate. Full sample-test verification is §17.
npm run ui:headless
```

Failing any of 16.1–16.5 is non-conformance regardless of 16.6. §16.6 is the
minimum signal that nothing is broken; §[smoke](#sec-smoke) is the actual
build-completion gate.

---

## 17. Sample-test smoke verification <a id="sec-smoke"></a>

A correct file structure that doesn't actually run is not done. Once §1–§16
pass, **pick one sample test and prove it works end-to-end** before declaring
the build complete. This is C13.

### 17.1 Pick the sample

| Trigger | Sample spec |
|---|---|
| `project_bootstrap` (fresh `BASE_URL`) | The first spec produced by §[capture](#sec-capture) — typically the login render check + happy-path login (`features/login.spec.ts`). |
| `add_feature` | The newly-added `features/<feature>.spec.ts`. |
| `format_fix` / `structure_audit` | The most recently-touched spec, OR `features/login.spec.ts` if no spec was edited. |
| `base_url_onboarding` (re-pointed env) | `features/login.spec.ts` — confirms the new target is reachable and the canonical flow still maps. |

Exactly one sample. Don't run the whole suite as the smoke — a single focused
pass is the signal; the suite run comes after.

### 17.2 Run it

1. **Headed pass.** Run the sample spec with the trace on so the run is
   visually inspectable:

   ```bash
   npx playwright test features/<sample>.spec.ts --headed --project=chromium --workers=1 --trace on
   ```

   Watch the browser. The flow must complete without manual intervention,
   without surprise dialogs, without locator timeouts. Inspect
   `test-results/runs/.../trace.zip` — every `step_*` and `verify_*` should
   appear as a discrete entry.

2. **Headless pass.** Re-run the same spec headless to prove it's not
   display-dependent:

   ```bash
   npx playwright test features/<sample>.spec.ts --project=chromium --workers=1
   ```

3. **Full suite headless.** Finally:

   ```bash
   npm run ui:headless
   ```

   All specs pass. No `retry #1` results in the JSON report.

### 17.3 Pass criteria (all must hold)

- Headed run exits `0` on the first attempt — no manual reload, no skipped
  assertions, no `test.fixme`/`test.skip` left in the spec.
- Headless run of the same spec exits `0` on the first attempt.
- `test-results/results.json` shows `status: "passed"` for every test in the
  sample spec, and the array of `retries` is empty (`[]`) — a pass that only
  occurred on retry is **not** a pass for this gate.
- `test-results/html-report` opens cleanly; no broken trace links.
- No new entries written to `test-results/captures/` after the run (those are
  capture-time artifacts, not run-time).

### 17.4 If it fails

Do **not** retry-until-green. Treat first-run failure as data:

1. Open the trace (`npx playwright show-trace test-results/.../trace.zip`)
   and identify the failing locator or assertion.
2. If the locator is stale, **re-capture** per §[capture §3.4](#sec-capture)
   — the app changed, the snapshot is the source of truth.
3. If the assertion is wrong (UI text drift), update `expected.json`, not the
   spec body.
4. If the failure is structural (fixture missing, barrel export missing), fix
   the structure and re-run from §17.2 step 1.
5. Never paper over with `test.skip`, `expect.soft`, longer timeouts, or
   retries bumped above the configured value. Those are anti-patterns in this
   skill.

### 17.5 Report

When the smoke passes, summarise to the user in three lines:

- Sample spec path and test count.
- Headed result (pass / first-try) + headless result (pass / first-try).
- Full-suite headless result (pass count / total).

Then — and only then — the build for this trigger is complete.

---

## 18. Change log

- **4.3.0 (2026-05-03)** — Added §17 sample-test smoke verification as a hard
  build-completion gate. New contract clause C13 ("a build is not complete
  until the sample spec passes headed and headless on the live BASE_URL with
  no retries"). New `smoke_verify` intent in `triggers`. §14 add-feature
  checklist now ends with the §17 gate. §16.6 reframed as a bare runtime
  signal; §17 is the actual gate. New anchor `#sec-smoke`.
- **4.2.0 (2026-05-03)** — Added `@ordino`-mention trigger gate. Skill now
  engages only when a user message contains `@ordino` AND its intent matches
  one of `triggers.intents` (project_bootstrap, add_feature, structure_audit,
  format_fix, capture_loop, base_url_onboarding). Off-topic `@ordino` mentions
  fall through to the consumer's normal flow. Renamed file to
  `build-project-skill.md`. Templates, contract, and anchors unchanged.
- **4.1.0 (2026-05-03)** — Compressed without loss: folded §4 Rules into the
  contract (now C1–C12), trimmed prose in §0/§3/§13, removed §3 sub-headings
  and the meta preamble. All templates and grep targets unchanged. `#sec-rules`
  removed (was a duplicate of the contract).
- **4.0.0 (2026-05-03)** — Repackaged as MCP resource (`uri`/`name`/`mimeType`
  /`description`/`inputs`). Added §0 BASE_URL prompt-if-missing. Removed
  obsolete `bootstrap-check.mjs` ecosystem.
