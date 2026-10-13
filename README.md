# Portal App

A small developer portal built with Next.js. The `/portal` page shows:

- one card per external API. Three public APIs are wired in as placeholders: the npm registry, Maven Central and GitHub;
- an **Azure traffic** section with a Production / Staging toggle, showing each web app's requests, server errors and average response time for the last hour.

The app runs on Azure App Service, in a staging and a production environment, and is deployed by GitHub Actions.

For how the app is put together and what every npm package is for, see [docs/SETUP.md](docs/SETUP.md).

## Requirements

- Node.js 24 or later (`.nvmrc` pins the major version)

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000/portal. Use `localhost`, not the network address the dev server also prints: in development, buttons only respond when the page is opened as `localhost`.

The Azure traffic section does not appear with `npm run dev`, because it signs in with an identity that exists only on Azure. To see it locally with made-up numbers, run `npm run dev:mock` instead.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run dev:mock` | Start the development server with test data for the Azure traffic section |
| `npm run build` | Build for production |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Generate Next.js route types, then check types with TypeScript |
| `npm test` | Run the unit tests (Vitest) |
| `npm run test:e2e` | Build the app and run the end-to-end tests (Playwright) |
| `npm run audit:sonatype` | Check every installed package for known vulnerabilities (Sonatype) |

The end-to-end tests need a browser. On CI they use Playwright's bundled Chromium (`npx playwright install chromium`). On a developer machine they use the installed Google Chrome.

## Architecture

The app follows model, view, controller:

```
src/
  models/          One folder per API. Each model fetches its API and returns plain data.
    npmPackage/  maven/  github/     The three API cards; each returns a PortalItem.
    azureResources/                  identity/ gets the sign-in token, metrics/ reads the
                                     traffic numbers, types.ts holds the shared types.
    data/                            Shared code: fetchData.ts (fetchJson, fetchPortalItem)
                                     and utils.ts (loadConfig, isRecord).
  controllers/     portalController.ts lists what the page shows and loads it all at once.
    utils/         loaders.ts turns a failure into an "unavailable" result, so one
                   broken source never breaks the page.
  views/           What the page looks like: PortalLayout, PortalView, EnvironmentPanel,
                   RefreshButton.
  components/      The component library (styled-components): button/, card/, toggle/, theme.
  app/             Next.js routes. A route only connects a controller to a view.
  lib/             Framework glue (styled-components server rendering).
  test-utils/      Helpers used only by unit tests.
test/              Playwright end-to-end tests, and mock-data/ with the mock API they run against.
```

`/` has no page of its own: `next.config.ts` redirects it to `/portal`.

Unit tests sit next to the code they test (`*.test.ts`). They call a real local HTTP server instead of mocking `fetch`, and a guard (`src/test-utils/blockExternalRequests.ts`) makes any request to a real service fail.

## Configuration

Settings come from environment variables. All are optional.

| Variable | Default | Purpose |
|---|---|---|
| `NPM_API_URL` | `https://registry.npmjs.org` | Address of the npm registry |
| `MAVEN_API_URL` | `https://search.maven.org` | Address of Maven Central's search |
| `GITHUB_API_URL` | `https://api.github.com` | Address of the GitHub API |
| `AZURE_PRODUCTION_RESOURCE_ID` | none | Azure Resource ID of the production web app. Without it, Production is left out of the Azure traffic section |
| `AZURE_STAGING_RESOURCE_ID` | none | The same for the staging web app |
| `AZURE_MANAGEMENT_URL` | `https://management.azure.com` | Address of Azure's management API. Only tests change it |
| `AUDITJS_GUIDE_TOKEN` | none | Sonatype token, needed only for `npm run audit:sonatype` |

On your own machine, put values in a file named `.env.local` at the project root, one `NAME=value` per line. Git ignores every `.env*` file, so real values are never pushed. On Azure, the two resource IDs are set on each web app under Settings > Environment variables.

Never give a secret a name starting with `NEXT_PUBLIC_`, because Next.js sends those values to the browser.

Each API call gives up after 5 seconds, and the card for that API then shows "unavailable".

## Adding an API

1. Write a failing unit test, then a model in its own folder under `src/models/`. Build it on `fetchPortalItem` from `src/models/data/fetchData.ts`: give it the address, a name for error messages, and a function that turns the API's answer into a `PortalItem`.
2. If it needs an address setting, add it to `PortalConfig` (`src/models/azureResources/types.ts`) and to `loadConfig` (`src/models/data/utils.ts`).
3. Add one entry to the `sources` list in `src/controllers/portalController.ts`.
4. Add a route to `test/mock-data/mock-api.mjs` and an assertion to `test/portal.spec.ts`.

## Contributing

Pushing straight to `main` is blocked by a Husky hook (`.husky/pre-push`), which `npm install` activates. Work on a branch, push it, and open a pull request.

## Continuous integration and deployment

`.github/workflows/ci.yml` runs on every pull request and on every push to `main`.

| Job | Runs on | What it does |
|---|---|---|
| Lint, type check, test and build | Pull requests and `main` | Lint, type check, unit tests, then a production build with the end-to-end tests. The Playwright report is kept for 7 days |
| Build the deployment package | `main` only | Builds the self-contained bundle once and stores it as an artifact |
| Deploy to staging | `main` only | Deploys that package to the staging web app |
| Deploy to production | `main` only | Waits for approval under "Review deployments", deploys the same package to production, then creates the next version tag (for example `v0.1.2`) |

Deployments sign in to Azure without a stored password, using the GitHub environments `staging` and `production`. Each deployment empties the web app's folder first, so files from an earlier version cannot be mixed into the new one.

A run that is waiting for production approval holds back later runs on `main`. Approve, reject or cancel it to let the next one start.

## Dependency security

`npm run audit:sonatype` runs Sonatype's `auditjs` against [Sonatype Guide](https://guide.sonatype.com), the service that replaced OSS Index. It checks every installed package, development tools included, and exits with an error when one has a known vulnerability.

`.github/workflows/security.yml` runs the scan when `package.json`, `package-lock.json` or `auditjs.json` changes, every Monday at 06:00 UTC, and on demand. Sonatype charges credits per package scanned, which is why it does not run on every push. It runs beside the CI workflow and does not block a deployment.

Findings that cannot be fixed yet are accepted in `auditjs.json` at the project root, each with a reason. To accept another, add an entry:

```json
{ "id": "<vulnerability id from the report>", "reason": "Why this is acceptable for now" }
```

Review that file when updating dependencies, and delete entries once a fix exists.
