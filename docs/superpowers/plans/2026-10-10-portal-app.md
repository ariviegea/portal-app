# Portal App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Neither sub-skill is installed on this machine; without them, implement the tasks in order in one session and follow the `test-driven-development` skill.

**Goal:** A Next.js portal at `/portal` that shows one card per external API (npm, Maven Central, GitHub), built test-first, with a CI workflow ready for GitHub.

**Architecture:** Model-view-controller on the Next.js App Router. Models fetch one API each and map it to a common `PortalItem`; the controller runs all models and turns failures into per-source error results; the view is a set of styled-components fed by a thin server route. API base URLs come from environment variables, so Playwright runs the app against a local mock API with no test code in production files.

**Tech Stack:** Node 24 LTS, Next.js 16 (App Router), React 19, TypeScript (strict), ESLint (`eslint-config-next`), styled-components 6, Vitest 5, Playwright (Chromium), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-10-portal-app.md`

## Global Constraints

- Project root: `/Users/ariadna/portal-app`. All paths below are relative to it.
- Packages required by the spec: `typescript`, `eslint`, `playwright` (`@playwright/test`), `vitest`. Use the versions `create-next-app@latest` and `npm install` select; do not pin by hand.
- Node `>=24` in `package.json` `engines` and `.nvmrc` containing `24`. Vitest 5 does not run on Node 20.
- Playwright E2E tests live in the top-level folder `test/` and nowhere else. Vitest unit tests sit next to the code as `src/**/*.test.ts`.
- Route `/portal` exists. Component library lives in `src/components/`, with the button in `src/components/button/`, and uses styled-components.
- MVC folders: `src/models/`, `src/controllers/`, `src/views/`. Files in `src/app/` only wire a route to a controller and a view.
- TDD: no production code without a failing test first (`test-driven-development` skill). Tests use real HTTP against a local server, not mocked `fetch`.
- No secrets in the repository. No API keys are needed for the three placeholder APIs.
- Commit after every task with a conventional message (`chore:`, `feat:`, `test:`, `ci:`).

## Review Focus

1. **One API is down or rate-limited** (GitHub returns 403 after 60 anonymous requests an hour): the other cards still show, and the failed one says it is unavailable. Tests: Task 3 Step 1, Task 4 Step 2.
2. **An API hangs:** the page must still answer within about 5 seconds. Test: Task 2 Step 1 (`times out`).
3. **An API answers 200 with an unexpected body** (HTML error page, changed JSON shape, empty search result): treated as that source's failure, never a crash. Tests: Task 2 Step 3.
4. **Environment variables missing or written with a trailing slash:** defaults apply and URLs are still built correctly. Test: Task 2 Step 5.
5. **Stale data after Refresh:** pressing Refresh must fetch again, not replay a cached page. Test: Task 4 Step 2 (`Refresh loads new data`).

## Changes made during implementation

- **Node install:** Homebrew on this Mac is too old (3.3.6), so Node 24.21.0 came from the official nodejs.org build, unpacked to `~/.local/node`.
- **No `output: "standalone"`:** `next start` does not serve a standalone build, and the E2E tests use `next start`. Packaging for Azure is left to the deployment plan.
- **No `export const dynamic`:** Next.js 16.4 enables Cache Components by default. The page keeps a static shell and loads the API data inside `<Suspense>` after `await connection()`, so data is fetched per request. `fetchJson` passes no `cache` option because fetches are uncached by default in this mode.
- **View split in two:** `PortalLayout` (heading and Refresh, part of the static shell) and `PortalView` (the cards, streamed in).
- **`@types/node` raised to 24** to satisfy Vitest 5. `vitest.config.ts` became `vitest.config.mts`.
- **Local E2E browser:** Playwright no longer ships Chromium for macOS 13, so local runs use the installed Google Chrome; CI uses bundled Chromium.
- **Playwright waits on `/`** instead of `/portal` to decide the app has started.
- **`typecheck` runs `next typegen` first:** `LayoutProps` and other route types are generated files that git ignores, so a fresh checkout (and CI) has none until they are generated.
- **Git:** the installed git predates `git init -b`; the branch was named `main` separately.
- **Maven Central:** on 2026-10-10 `search.maven.org` did not answer fielded queries within 30 seconds. The model and default address are unchanged; the card shows "unavailable" after the 5 second timeout. `central.sonatype.com/solrsearch/select` answers quickly but returns a different shape (one row per version, no `latestVersion`).

---

## File Structure

```
portal-app/
  .github/workflows/ci.yml        CI: lint, typecheck, unit, build, e2e
  .nvmrc                          24
  next.config.ts                  styled-components compiler, standalone output
  playwright.config.ts            runs mock API + app, tests in test/
  vitest.config.ts                node environment, src/**/*.test.ts
  tsconfig.json                   strict settings, @/* alias
  test/
    mock-api.mjs                  local stand-in for the three APIs (E2E only)
    portal.spec.ts                Playwright tests
  src/
    app/layout.tsx                wraps pages in the styled-components registry
    app/page.tsx                  redirects / to /portal
    app/portal/page.tsx           controller -> view, nothing else
    models/types.ts               PortalItem, SourceId, SourceResult, PortalConfig
    models/config.ts              loadConfig(env)
    models/fetchJson.ts           fetch with timeout and status check
    models/npmPackageModel.ts     getNpmPackage
    models/mavenArtifactModel.ts  getMavenArtifact
    models/githubRepoModel.ts     getGithubRepo
    controllers/portalController.ts   getPortalData
    views/portal/PortalView.tsx   page layout for the results
    views/portal/RefreshButton.tsx    client button calling router.refresh()
    components/theme.ts           colour, spacing and font tokens
    components/button/Button.tsx  + index.ts
    components/card/Card.tsx      + index.ts
    lib/StyledComponentsRegistry.tsx  server-side style collection
    test-utils/httpServer.ts      startServer() for unit tests
```

---

### Task 0: Install Node.js (needs the owner's go-ahead)

Node is not installed on this Mac (macOS 13.7.8, Intel). Homebrew is at `/usr/local/bin/brew`.

- [ ] **Step 1: Install Node 24 LTS**

Run: `brew install node@24 && brew link --overwrite --force node@24`
If Homebrew has no prebuilt package for macOS 13 and starts compiling, stop it and install the official build instead: download `https://nodejs.org/dist/v24.21.0/node-v24.21.0-darwin-x64.tar.gz`, unpack to `~/.local/node`, and add `export PATH="$HOME/.local/node/bin:$PATH"` to `~/.zshrc`.

- [ ] **Step 2: Verify**

Run: `node --version && npm --version`
Expected: `v24.x.x` and an npm version.

### Task 1: Scaffold and tooling

**Files:**
- Create: everything `create-next-app` generates, plus `.nvmrc`, `vitest.config.ts`, `playwright.config.ts`
- Modify: `tsconfig.json`, `package.json`, `next.config.ts`, `.gitignore`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`; alias `@/*` -> `src/*`.

- [ ] **Step 1: Generate the app**

The folder already holds `docs/`. Run in `/Users/ariadna`:
`npx create-next-app@latest portal-app --typescript --eslint --app --src-dir --import-alias "@/*" --use-npm --no-tailwind --no-turbopack --yes`
If it refuses because the folder is not empty, generate into `/Users/ariadna/portal-app-tmp`, move its contents in, and delete the temporary folder.

- [ ] **Step 2: Add dependencies**

Run: `npm install styled-components` and `npm install -D vitest @playwright/test` then `npx playwright install chromium`.

- [ ] **Step 3: Tighten `tsconfig.json`**

Keep what the generator wrote and set in `compilerOptions`: `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true`, `"forceConsistentCasingInFileNames": true`.

- [ ] **Step 4: Configure tools**

- `package.json`: add `"engines": {"node": ">=24"}` and scripts `"typecheck": "tsc --noEmit"`, `"test": "vitest run"`, `"test:e2e": "playwright test"`.
- `.nvmrc`: `24`.
- `next.config.ts`: `compiler: { styledComponents: true }`, `output: "standalone"`.
- `vitest.config.ts`: `environment: "node"`, `include: ["src/**/*.test.ts"]`, alias `@` -> `./src`, `passWithNoTests: true`.
- `playwright.config.ts`: `testDir: "./test"`, `testMatch: "**/*.spec.ts"`, one project `chromium`, `use.baseURL: "http://localhost:3100"`, `forbidOnly: !!process.env.CI`, `retries: process.env.CI ? 1 : 0`, `reporter: [["list"], ["html", { open: "never" }]]`, and `webServer` as an array:
  1. `node test/mock-api.mjs`, url `http://localhost:4010/health`
  2. `npm run build && npm run start -- -p 3100`, url `http://localhost:3100/portal`, `timeout: 180000`, `env: { NPM_API_URL: "http://localhost:4010/npm", MAVEN_API_URL: "http://localhost:4010/maven", GITHUB_API_URL: "http://localhost:4010/github" }`
  Both with `reuseExistingServer: !process.env.CI`.
- `.gitignore`: add `playwright-report/`, `test-results/`.

- [ ] **Step 5: Verify the toolchain**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: all four exit 0 (Vitest reports no test files).

- [ ] **Step 6: Commit**

`git init -b main`, set the repository's `user.name` and `user.email` (values from the owner), then `git add -A && git commit -m "chore: scaffold Next.js app with TypeScript, ESLint, Vitest and Playwright"`.

### Task 2: Models

**Files:**
- Create: `src/models/types.ts`, `config.ts`, `fetchJson.ts`, `npmPackageModel.ts`, `mavenArtifactModel.ts`, `githubRepoModel.ts`, `src/test-utils/httpServer.ts`
- Test: `src/models/fetchJson.test.ts`, `npmPackageModel.test.ts`, `mavenArtifactModel.test.ts`, `githubRepoModel.test.ts`, `config.test.ts`

**Interfaces:**
- Produces:

```ts
// types.ts
export type PortalItem = { title: string; detail: string; href: string };
export type SourceId = "npm" | "maven" | "github";
export type SourceResult =
  | { id: SourceId; label: string; status: "ok"; item: PortalItem }
  | { id: SourceId; label: string; status: "error"; message: string };
export type PortalConfig = { npmApiUrl: string; mavenApiUrl: string; githubApiUrl: string };

// config.ts
export function loadConfig(env?: Record<string, string | undefined>): PortalConfig; // default process.env
// fetchJson.ts
export function fetchJson(url: string, options?: { timeoutMs?: number }): Promise<unknown>; // default 5000
// models: each rejects with an Error when the request fails or the body has the wrong shape
export function getNpmPackage(baseUrl: string, name: string): Promise<PortalItem>;
export function getMavenArtifact(baseUrl: string, group: string, artifact: string): Promise<PortalItem>;
export function getGithubRepo(baseUrl: string, fullName: string): Promise<PortalItem>;
// test-utils/httpServer.ts
export function startServer(handler: http.RequestListener): Promise<{ url: string; close(): Promise<void> }>; // port 0
```

- [ ] **Step 1: Write failing tests for `fetchJson`** (each starts a real server with `startServer`)

- `returns parsed JSON`: server sends `{"ok":true}` -> resolves `{ ok: true }`.
- `rejects on a non-2xx status`: server sends 503 -> rejects with message `Request failed with status 503`.
- `rejects when the body is not JSON`: server sends 200 `<html>` -> rejects.
- `times out`: server answers after 300 ms, `timeoutMs: 50` -> rejects with message `Request timed out`.

- [ ] **Step 2: Run, watch them fail, implement `fetchJson`, run until green**

Run: `npx vitest run src/models/fetchJson.test.ts`. First run: FAIL (module missing). Implement with `fetch(url, { cache: "no-store", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(timeoutMs) })`.

- [ ] **Step 3: Write failing tests for the three models**

| Model call | Server response | Expectation |
|---|---|---|
| `getNpmPackage(url, "next")`, path `/next/latest` | `{"name":"next","version":"16.4.0","description":"The React Framework"}` | `{ title: "next 16.4.0", detail: "The React Framework", href: "https://www.npmjs.com/package/next" }` |
| same | `{"name":"next"}` | rejects `Unexpected response from npm` |
| `getMavenArtifact(url, "org.apache.commons", "commons-lang3")`, path `/solrsearch/select`, query `q=g:"org.apache.commons" AND a:"commons-lang3"`, `rows=1`, `wt=json` | `{"response":{"docs":[{"g":"org.apache.commons","a":"commons-lang3","latestVersion":"3.14.0"}]}}` | `{ title: "org.apache.commons:commons-lang3 3.14.0", detail: "Latest version on Maven Central", href: "https://central.sonatype.com/artifact/org.apache.commons/commons-lang3" }`; the test also asserts the `q` the server received |
| same | `{"response":{"docs":[]}}` | rejects `Maven Central has no artifact org.apache.commons:commons-lang3` |
| `getGithubRepo(url, "vercel/next.js")`, path `/repos/vercel/next.js` | `{"full_name":"vercel/next.js","stargazers_count":120000,"open_issues_count":3000,"html_url":"https://github.com/vercel/next.js"}` | `{ title: "vercel/next.js", detail: "120000 stars · 3000 open issues", href: "https://github.com/vercel/next.js" }` |
| same | 403 | rejects `Request failed with status 403` |
| same | `{"full_name":"vercel/next.js","html_url":"javascript:alert(1)","stargazers_count":1,"open_issues_count":1}` | rejects `Unexpected response from GitHub` (href must start with `https://`) |

- [ ] **Step 4: Run, watch them fail, implement the three models, run until green**

Run: `npx vitest run src/models`. Each model validates field types by hand (no schema library).

- [ ] **Step 5: Write failing tests for `loadConfig`, then implement**

- `loadConfig({})` -> `{ npmApiUrl: "https://registry.npmjs.org", mavenApiUrl: "https://search.maven.org", githubApiUrl: "https://api.github.com" }`.
- `loadConfig({ NPM_API_URL: "http://localhost:4010/npm/" })` -> `npmApiUrl` is `"http://localhost:4010/npm"` (trailing slash removed), others default.
- `loadConfig({ MAVEN_API_URL: "" })` -> `mavenApiUrl` is the default.

- [ ] **Step 6: Full check and commit**

Run: `npm run lint && npm run typecheck && npm test`. Expected: all pass.
`git commit -m "feat: add API models with timeout and response validation"`

### Task 3: Controller

**Files:**
- Create: `src/controllers/portalController.ts`
- Test: `src/controllers/portalController.test.ts`

**Interfaces:**
- Consumes: Task 2 models, `loadConfig`, types.
- Produces: `export function getPortalData(config?: PortalConfig): Promise<SourceResult[]>` (default `loadConfig()`). Never rejects. Always three results in the order `npm`, `maven`, `github`, with labels `"npm package"`, `"Maven artifact"`, `"GitHub repository"`. Tracked items: npm `next`, Maven `org.apache.commons:commons-lang3`, GitHub `vercel/next.js`. Error message: `` `${label} is unavailable right now.` ``

- [ ] **Step 1: Write the failing tests** (one real server routing by path prefix `/npm`, `/maven`, `/github`)

- `returns one ok result per source`: all three answer correctly -> ids `["npm","maven","github"]`, every status `"ok"`, `results[0].item.title === "next 16.4.0"`.
- `keeps working sources when one fails`: `/github` answers 403 -> `results[2]` equals `{ id: "github", label: "GitHub repository", status: "error", message: "GitHub repository is unavailable right now." }`, and `results[0].status` and `results[1].status` are `"ok"`.
- `reports every source as failed when nothing answers`: config points at a closed port -> three `"error"` results, promise resolves.

- [ ] **Step 2: Run to verify failure, implement with `Promise.allSettled`, run until green**

Run: `npx vitest run src/controllers`. Log the underlying error with `console.error` on the server; do not put it in `message`.

- [ ] **Step 3: Full check and commit**

Run: `npm run lint && npm run typecheck && npm test`.
`git commit -m "feat: add portal controller aggregating API sources"`

### Task 4: View, component library and the /portal route

**Files:**
- Create: `test/mock-api.mjs`, `test/portal.spec.ts`, `src/components/theme.ts`, `src/components/button/Button.tsx`, `src/components/button/index.ts`, `src/components/card/Card.tsx`, `src/components/card/index.ts`, `src/lib/StyledComponentsRegistry.tsx`, `src/views/portal/PortalView.tsx`, `src/views/portal/RefreshButton.tsx`, `src/app/portal/page.tsx`
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`; delete the generator's sample page styles and assets that are no longer used.

**Interfaces:**
- Consumes: `getPortalData`, `SourceResult`.
- Produces:
  - `Button`: props `React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }`, default `"primary"`, `type="button"` unless given.
  - `Card`: props `{ label: string; title: string; detail: string; href?: string; tone?: "default" | "error"; "data-testid"?: string }`.
  - `PortalView`: props `{ results: SourceResult[] }`.
  - Page markup contract used by the tests: `<h1>Developer Portal</h1>`; a button named `Refresh`; one card per result with `data-testid="source-<id>"`; an ok card links its title to `item.href`; an error card shows `message`.

- [ ] **Step 1: Write the mock API** (`test/mock-api.mjs`, Node `http`, port 4010, no dependencies)

- `GET /health` -> 200 `ok`.
- `GET /npm/next/latest` -> `{"name":"next","version":"1.0.<n>","description":"The React Framework"}` where `<n>` counts requests to this path, starting at 1.
- `GET /maven/solrsearch/select` -> the Maven body from Task 2.
- `GET /github/...` -> 503.
- anything else -> 404.

- [ ] **Step 2: Write the failing Playwright tests** (`test/portal.spec.ts`)

- `home redirects to the portal`: `goto("/")` -> URL ends with `/portal`.
- `shows the portal heading`: heading level 1 with name `Developer Portal`.
- `shows data from each working API`: `source-npm` contains `next 1.0.` and `The React Framework`; `source-maven` contains `org.apache.commons:commons-lang3 3.14.0`; the Maven title link has `href` `https://central.sonatype.com/artifact/org.apache.commons/commons-lang3`.
- `shows an unavailable message for a failing API and keeps the others`: `source-github` contains `GitHub repository is unavailable right now.` while `source-npm` and `source-maven` are visible.
- `Refresh loads new data`: read the npm card text, click the `Refresh` button, expect the npm card text to change (`expect(card).not.toHaveText(before)`).
- `works at phone width`: viewport 390x844 -> all three cards visible and `document.documentElement.scrollWidth <= clientWidth`.

- [ ] **Step 3: Run to verify failure**

Run: `npm run test:e2e`
Expected: FAIL, `/portal` returns 404.

- [ ] **Step 4: Implement**

- `StyledComponentsRegistry.tsx`: client component using `ServerStyleSheet`, `StyleSheetManager` and `useServerInsertedHTML` (the pattern in the Next.js styled-components guide); `layout.tsx` wraps `children` in it and sets `metadata.title` to `Developer Portal`.
- `theme.ts`: plain object of tokens; `Button` and `Card` are `"use client"` styled-components reading from it, with a visible `:focus-visible` outline and text contrast of at least 4.5:1.
- `PortalView.tsx`: server component; `<main>`, the heading, `RefreshButton`, a responsive grid (`repeat(auto-fit, minmax(260px, 1fr))`) of `Card`s.
- `RefreshButton.tsx`: client component rendering `Button` and calling `router.refresh()` inside `useTransition`; `disabled` while pending.
- `src/app/portal/page.tsx`: `export const dynamic = "force-dynamic"`; `return <PortalView results={await getPortalData()} />`.
- `src/app/page.tsx`: `redirect("/portal")`.

- [ ] **Step 5: Run until green, then the full suite**

Run: `npm run test:e2e`, then `npm run lint && npm run typecheck && npm test && npm run build`.
Expected: 6 Playwright tests pass; everything else exits 0.

- [ ] **Step 6: Commit**

`git commit -m "feat: add /portal route with styled-components view and E2E tests"`

### Task 5: GitHub Actions CI and README

**Files:**
- Create: `.github/workflows/ci.yml`, `README.md` (replace the generated one)

- [ ] **Step 1: Write the workflow**

`name: CI`; triggers `push` to `main` and `pull_request`; `permissions: contents: read`; `concurrency` cancelling superseded runs per ref. One job `verify` on `ubuntu-latest`, `timeout-minutes: 15`:
1. `actions/checkout`
2. `actions/setup-node` with `node-version-file: .nvmrc` and `cache: npm`
3. `npm ci`
4. `npm run lint`
5. `npm run typecheck`
6. `npm test`
7. `npx playwright install --with-deps chromium`
8. `npm run test:e2e` (the Playwright config builds and starts the app itself)
9. `actions/upload-artifact` of `playwright-report/` with `if: ${{ !cancelled() }}`, `retention-days: 7`

Use the current major version tag of each action.

- [ ] **Step 2: Check the workflow locally**

Run the same commands as steps 3 to 8 in a clean clone: `git clone . /tmp/portal-ci-check && cd /tmp/portal-ci-check && npm ci && npm run lint && npm run typecheck && npm test && CI=1 npm run test:e2e`
Expected: all exit 0. Delete the clone afterwards. The workflow file itself is only proven once GitHub runs it.

- [ ] **Step 3: Write the README**

Sections: what the app is; requirements (Node 24); commands (`dev`, `lint`, `typecheck`, `test`, `test:e2e`); the MVC folder map from this plan; environment variables `NPM_API_URL`, `MAVEN_API_URL`, `GITHUB_API_URL` with their defaults; how to add a new API (one model file, one line in the controller, one mock route, one E2E assertion).

- [ ] **Step 4: Commit**

`git commit -m "ci: add GitHub Actions workflow and README"`

---

## Not in this plan: Azure deployment

A separate plan once the repository is on GitHub and an Azure subscription is chosen. Intended shape, so nothing here blocks it:

- **Target:** Azure App Service (Linux, Node 24). It runs the server-rendered `/portal` route as is; `output: "standalone"` in Task 1 already produces the small deployable bundle. Azure Static Web Apps is cheaper but its support for server-rendered Next.js is limited.
- **Pipeline:** a `deploy` job in GitHub Actions that runs only after `verify` passes on `main`: build, zip the standalone output, `azure/login` with OpenID Connect (no stored password), `azure/webapps-deploy`.
- **Needed from the owner then:** Azure subscription, resource group and app name, region, and permission to create an app registration for the GitHub login.
- **App settings in Azure:** the three `*_API_URL` variables only if the real APIs differ from the defaults; any API keys go in App Service settings or Key Vault, never in the repository.
