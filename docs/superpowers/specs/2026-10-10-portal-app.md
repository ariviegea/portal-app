# Portal App Spec

Source: the owner's request of 2026-10-10, lightly tidied. Decisions the request left open are listed at the end.

## Request

Build a Next.js application.

- Use these npm packages: typescript, eslint, playwright, vitest (if needed).
- E2E testing: create a folder called `test`. It holds the test-driven-development Playwright tests that will run later in the pipeline (GitHub Actions; the owner is unsure how to set this up).
- Architecture: model, view, controller.
- Create a route called `/portal`.
- Create a folder called `components`. Inside it, a folder called `button`. The component library lives there and uses styled-components.
- Create a tsconfig.

## Purpose

A small UI portal, as a start, that fetches from several APIs.

The app will be pushed to a GitHub repository. The owner then wants GitHub Actions and a pipeline deploying to Azure, with guidance.

## Quality bar

Best practices throughout. Use the installed skills (`writing-plans`, `test-driven-development`).

## Decisions the request left open

| Question | Decision used by the plan | Owner can change |
|---|---|---|
| Which APIs? | Three public, key-free placeholders: npm registry, Maven Central search, GitHub repositories | Yes, each is one model file |
| Where does the project live? | `/Users/ariadna/portal-app` | Yes |
| Node.js version | 24 LTS (not yet installed on this Mac) | Yes |
| Next.js router | App Router, `src/` directory | No strong reason to |
| Azure target | Azure App Service (Linux, Node), decided in a follow-up plan | Yes |
