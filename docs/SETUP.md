# How Portal App is set up

This document explains how the application is put together and what every npm package in `package.json` is for. For day-to-day commands, see the [README](../README.md).

Versions listed are the ones installed on 2026-10-10. `package-lock.json` is the exact record.

## What the app is

A small developer portal built with Next.js. The page at `/portal` shows one card per external API. Three public APIs are wired in as placeholders: the npm registry, Maven Central and GitHub.

## How a request flows through the app

The app follows model, view, controller (MVC):

1. A visitor opens `/portal`. Next.js runs `src/app/portal/page.tsx`. This file only connects the controller to the view.
2. The page calls the **controller**, `getPortalData()` in `src/controllers/portalController.ts`.
3. The controller calls every **model** in `src/models/` at the same time. Each model fetches one API and converts the answer into a common shape, a `PortalItem` (title, detail, link).
4. If a model fails (API down, too slow, unexpected answer), the controller turns that into an "unavailable" result. One broken API never breaks the page.
5. The **view** in `src/views/portal/` receives the results and draws one card for each, using the component library in `src/components/`.

The heading and the Refresh button are built once, when the app is built. The cards are loaded for each visit, so the data is always current. The Refresh button asks the server for the data again without reloading the page.

## Folder map

```
portal-app/
  src/
    app/            Next.js routes: /, /portal, and the root layout
    models/         One file per API, plus shared fetch, config and types
    controllers/    portalController.ts: runs all models, handles failures
    views/portal/   Page layout, card grid, Azure traffic section, Refresh button
    components/     Component library (styled-components): button/, card/, toggle/, theme
    lib/            Glue so styled-components works with server rendering
    test-utils/     Helper used only by unit tests (a real local HTTP server)
  test/             Playwright end-to-end tests and the mock API they use
  docs/             This file, plus the original spec and implementation plan
  .github/workflows/
    ci.yml          Lint, type check, unit tests, build, end-to-end tests
    security.yml    Sonatype vulnerability scan
```

## npm packages

There are 13 packages. The first four ship with the running app. The other nine are development tools: they are used to build, check and test the app, and never reach visitors.

### Packages the running app uses (`dependencies`)

| Package | Version | What we use it for |
|---|---|---|
| `next` | 16.4.0 | The framework. It provides the routes (`/` and `/portal`), renders pages on the server, builds the production bundle, and runs the dev server (`npm run dev`). |
| `react` | 19.3.0 | The UI library Next.js is built on. Every component, such as `Button`, `Card` and `PortalView`, is a React component. |
| `react-dom` | 19.3.0 | Connects React to the browser: it turns React components into HTML on the server and makes them interactive in the browser. Required by Next.js; we never import it directly. |
| `styled-components` | ^6.5.3 | Styling for the component library. Each component in `src/components/` and `src/views/` defines its CSS next to its markup. `src/lib/StyledComponentsRegistry.tsx` makes those styles arrive with the first page load. |

### Development tools (`devDependencies`)

| Package | Version | What we use it for |
|---|---|---|
| `typescript` | 5.9.3 | Type checking. All source code is TypeScript; `npm run typecheck` reports type errors before the code runs. Settings are in `tsconfig.json` (strict mode on). |
| `@types/node` | 24.19.2 | Type definitions for Node.js itself, so TypeScript understands things like `process.env` and the `node:http` module used by the test server. Matches Node 24. |
| `@types/react` | 19.3.0 | Type definitions for React, so TypeScript can check component props and hooks. |
| `@types/react-dom` | 19.3.0 | Type definitions for `react-dom`. Needed by Next.js's TypeScript setup. |
| `eslint` | 9.39.5 | Linter. `npm run lint` checks the code for likely mistakes and inconsistent patterns. Configured in `eslint.config.mjs`. |
| `eslint-config-next` | 16.4.0 | The rule set ESLint applies: Next.js's recommended rules, including React, accessibility, performance ("core web vitals") and TypeScript rules. Its version matches `next`. |
| `vitest` | 5.0.3 | Unit test runner. `npm test` runs the `*.test.ts` files next to the models and the controller (42 tests). Configured in `vitest.config.mts`. |
| `@playwright/test` | 1.64.0 | End-to-end test runner. `npm run test:e2e` builds the app, starts it together with a mock API, and drives a real browser through the tests in `test/` (10 tests). Configured in `playwright.config.ts`. |
| `auditjs` | 5.0.2 | Sonatype's vulnerability scanner. `npm run audit:sonatype` checks every installed package against Sonatype Guide and fails if one has a known vulnerability. |

These 13 packages bring in several hundred others that they depend on themselves. Those are listed in `package-lock.json` and are also covered by the Sonatype scan.

## Scripts

| Command | What runs | When to use it |
|---|---|---|
| `npm run dev` | `next dev` | While developing. Opens the app at http://localhost:3000 and reloads on changes. |
| `npm run dev:mock` | `node test/dev-with-mock.mjs` | To see the Azure traffic section on your own computer. Same as `dev`, plus a stand-in for Azure that serves made-up numbers. |
| `npm run build` | `next build` | Creates the production build in `.next/`. |
| `npm run start` | `next start` | Serves the production build. Run `build` first. |
| `npm run lint` | `eslint` | Before committing. |
| `npm run typecheck` | `next typegen && tsc --noEmit` | Before committing. Generates Next.js's route types first, then checks all types. |
| `npm test` | `vitest run` | Unit tests. Takes about a second. |
| `npm run test:e2e` | `playwright test` | End-to-end tests. Builds and starts the app itself. |
| `npm run audit:sonatype` | `auditjs guide --dev --quiet` | Vulnerability scan. Needs a Sonatype token (see below). |

## Configuration files

| File | Purpose |
|---|---|
| `package.json` | Package list, scripts, and the required Node version (24 or later). |
| `package-lock.json` | Exact version of every installed package. Commit it; CI installs from it with `npm ci`. |
| `.nvmrc` | The Node major version (24). GitHub Actions reads it. |
| `tsconfig.json` | TypeScript settings. Strict mode, plus the `@/` shortcut for `src/`. |
| `next.config.ts` | Next.js settings: styled-components support and the caching model. |
| `eslint.config.mjs` | ESLint rules. |
| `vitest.config.mts` | Unit test settings: which files are tests, and the `@/` shortcut. |
| `playwright.config.ts` | End-to-end settings: test folder, browser, and how the app and mock API are started. |
| `.env.example` | Template listing the environment variables. Committed, placeholders only. |
| `.env.local` | Your real values. Ignored by git, never pushed. |
| `.gitignore` | Keeps installed packages, build output, test reports and `.env*` files out of git. |
| `AGENTS.md` | Written by Next.js for AI coding tools. It points them to the bundled Next.js documentation. |

## Environment variables

All are optional except the Sonatype token, which is only needed for the scan.

| Variable | Used by | Default |
|---|---|---|
| `NPM_API_URL` | npm model | `https://registry.npmjs.org` |
| `MAVEN_API_URL` | Maven model | `https://search.maven.org` |
| `GITHUB_API_URL` | GitHub model | `https://api.github.com` |
| `AZURE_PRODUCTION_RESOURCE_ID` | Azure metrics model | none; Production is left out of the Azure traffic section |
| `AZURE_STAGING_RESOURCE_ID` | Azure metrics model | none; Staging is left out of the Azure traffic section |
| `AZURE_MANAGEMENT_URL` | Azure metrics model | `https://management.azure.com` |
| `IDENTITY_ENDPOINT`, `IDENTITY_HEADER` | Azure identity model | set by Azure itself; never set these by hand |
| `AUDITJS_GUIDE_TOKEN` | `npm run audit:sonatype` | none |

Put real values in `.env.local`. Next.js loads it automatically. Never start a secret's name with `NEXT_PUBLIC_`: Next.js sends those values to the browser.

## Azure traffic section

On Azure, the portal shows an "Azure traffic" section below the API cards. A toggle switches between Production and Staging, and three tiles show the selected web app's last hour: requests, server errors and average response time. The numbers come from Azure Monitor, which records them for every web app.

How it works:

1. Each web app has a **managed identity** (web app > Settings > Identity > System assigned). Azure gives the running app a short-lived token for that identity on request, so no key or password is stored anywhere. `src/models/azureResources/azureIdentityModel.ts` fetches the token and keeps it in memory until shortly before it expires.
2. Both identities have the read-only **Monitoring Reader** role on both web apps (web app > Access control (IAM)).
3. `src/models/azureResources/azureMetricsModel.ts` asks Azure Monitor for the `Requests`, `Http5xx` and `HttpResponseTime` metrics of the web app named by the resource ID, minute by minute for the last hour, and adds them up. The average response time is weighted by each minute's requests.
4. The controller loads both environments together with the API cards and returns them separately (`sources` and `environments`).
5. `src/views/portal/EnvironmentPanel.tsx` draws the section, using the `Toggle` and `Card` components. Both environments are already on the page, so switching needs no new request. The Refresh button reloads both and keeps the selection.
6. The two resource IDs are set on each web app under Settings > Environment variables.

An environment is left out when the app has no managed identity or its resource ID is not set. That is the case on a developer machine, so the section appears only on Azure. An environment that is configured but fails (for example, a missing role) shows "unavailable". The section carries no links, so the subscription ID never appears in the page.

## Guards against leaking secrets

Real keys and IDs live only in `.env.local` (ignored by git), in GitHub's secrets and in Azure's settings. Two guards back that up:

- **Before each commit**, the hook in `.husky/pre-commit` runs `scripts/check-staged-secrets.mjs`. It stops the commit if an env file other than `.env.example` is staged, or if a staged file contains a value from `.env.local` (or an ID inside one, such as the subscription ID in a resource ID). It reads the values on your computer at that moment and names only the variable, never the value. It guards this computer only, and `git commit --no-verify` skips it.
- **In every unit test**, `src/test-utils/blockExternalRequests.ts` makes a request to anything other than this computer fail. Tests use local stand-in servers, so a test can never send a real token to a real service.

The values written in the test files (`sub-1`, `test-azure-token` and the like) are made up and unlock nothing.

## Testing

**Unit tests** (`src/**/*.test.ts`, Vitest) cover the models, the configuration loader and the controller. They do not mock `fetch`. Each test starts a small real HTTP server (`src/test-utils/httpServer.ts`) and points the code at it, so timeouts, error statuses and malformed answers are tested for real.

**End-to-end tests** (`test/portal.spec.ts`, Playwright) cover the page as a visitor sees it: the redirect from `/`, the heading, data from each API, the "unavailable" message, the Azure traffic toggle, the Refresh button, and the phone-width layout. They run against `test/mock-api.mjs`, a local stand-in for the three APIs and for Azure's identity and metrics endpoints, so the tests give the same result with or without internet. The mock deliberately makes the GitHub API fail, to test the "unavailable" card.

On a developer machine Playwright uses the installed Google Chrome. On GitHub it uses Playwright's own Chromium.

The code was written test-first: each test was written and seen to fail before the code that makes it pass.

## Pipelines (GitHub Actions)

| Workflow | Runs when | Steps |
|---|---|---|
| `ci.yml` | Every push to `main` and every pull request | Install, lint, type check, unit tests, end-to-end tests (which include the production build). Uploads the Playwright report. |
| `security.yml` | When `package.json` or `package-lock.json` changes, every Monday 06:00 UTC, and on demand | Install, Sonatype scan. Needs the repository secret `AUDITJS_GUIDE_TOKEN`. |

Neither workflow has run on GitHub yet; the repository has not been pushed. Deployment to Azure is planned as a later step.

## Setting up on a new machine

1. Install Node.js 24 or later.
2. Clone the repository and run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in any values you need.
4. Run `npm run dev` and open http://localhost:3000/portal.
5. For end-to-end tests, have Google Chrome installed, or run `npx playwright install chromium` and set `CI=1`.

## Known gaps

- **Maven Central:** on 2026-10-10 the default address did not answer the app's lookup, so that card showed "unavailable" against the live API.
- **APIs are placeholders:** the three APIs stand in for the real ones the portal will use.
- **Accepted vulnerabilities:** the Sonatype scan found 6 known vulnerabilities in 4 packages (`braces`, `minimatch`, `uri-js`, `zod`). All are pulled in by the lint and audit tools, none ship with the running app, and none had a fixed version on 2026-10-10. They are listed with reasons in `auditjs.json`, which makes the scan pass. Review that file when updating dependencies and delete entries once fixes exist. `npm audit` reports the `braces` chain as 5 high-severity warnings.
