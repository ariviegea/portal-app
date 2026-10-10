# Portal App

A small developer portal built with Next.js. The `/portal` page shows one card per external API. Three public APIs are wired in as placeholders: the npm registry, Maven Central and GitHub.

## Requirements

- Node.js 24 or later (`.nvmrc` pins the major version)

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000/portal.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Check types with TypeScript |
| `npm test` | Run the unit tests (Vitest) |
| `npm run test:e2e` | Build the app and run the end-to-end tests (Playwright) |

The end-to-end tests need a browser. On CI they use Playwright's bundled Chromium (`npx playwright install chromium`). On a developer machine they use the installed Google Chrome.

## Architecture

The app follows model, view, controller:

```
src/
  models/        One file per API. Fetches it and maps the answer to a PortalItem.
  controllers/   portalController.ts runs every model and turns failures into
                 "unavailable" results, so one broken API never breaks the page.
  views/         What the page looks like: PortalLayout, PortalView, RefreshButton.
  components/    The component library (styled-components): button/, card/, theme.
  app/           Next.js routes. A route only connects a controller to a view.
  lib/           Framework glue (styled-components server rendering).
  test-utils/    Helpers used only by unit tests.
test/            Playwright end-to-end tests and the mock API they run against.
```

Unit tests sit next to the code they test (`*.test.ts`). They call a real local HTTP server instead of mocking `fetch`.

## Configuration

The API addresses come from environment variables. All are optional.

| Variable | Default |
|---|---|
| `NPM_API_URL` | `https://registry.npmjs.org` |
| `MAVEN_API_URL` | `https://search.maven.org` |
| `GITHUB_API_URL` | `https://api.github.com` |

For local overrides, create a `.env.local` file (it is ignored by git). Never commit API keys.

Each API call gives up after 5 seconds, and the card for that API then shows "unavailable".

## Adding an API

1. Write a failing unit test, then a model in `src/models/` that returns a `PortalItem`.
2. Add its address to `PortalConfig` and `loadConfig` if it needs one.
3. Add one entry to the `sources` list in `src/controllers/portalController.ts`.
4. Add a route to `test/mock-api.mjs` and an assertion to `test/portal.spec.ts`.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and on every pull request: lint, type check, unit tests, then a production build with the end-to-end tests. The Playwright report is kept for 7 days as a workflow artifact.

Deployment to Azure is not set up yet. The plan is in `docs/superpowers/plans/`.
