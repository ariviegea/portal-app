import { defineConfig, devices } from "@playwright/test";

const APP_PORT = 3100;
const MOCK_API_PORT = 4010;
const mockApi = `http://localhost:${MOCK_API_PORT}`;
const isCI = !!process.env.CI;
const azureResource = (site: string) =>
  `/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test/providers/Microsoft.Web/sites/${site}`;

export default defineConfig({
  testDir: "./test",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // CI uses Playwright's bundled Chromium. Locally the installed Chrome is used,
        // because Playwright no longer ships Chromium for older macOS versions.
        channel: isCI ? undefined : "chrome",
      },
    },
  ],
  webServer: [
    {
      command: "node test/mock-api.mjs",
      url: `${mockApi}/health`,
      reuseExistingServer: !isCI,
    },
    {
      command: `npm run build && npm run start -- -p ${APP_PORT}`,
      url: `http://localhost:${APP_PORT}/`,
      timeout: 180_000,
      reuseExistingServer: !isCI,
      env: {
        NPM_API_URL: `${mockApi}/npm`,
        MAVEN_API_URL: `${mockApi}/maven`,
        GITHUB_API_URL: `${mockApi}/github`,
        // Stand-ins for what Azure provides to a web app with a managed identity.
        AZURE_MANAGEMENT_URL: `${mockApi}/azure/management`,
        IDENTITY_ENDPOINT: `${mockApi}/azure/identity`,
        IDENTITY_HEADER: "test-identity-header",
        AZURE_PRODUCTION_RESOURCE_ID: azureResource("portal-prod"),
        AZURE_STAGING_RESOURCE_ID: azureResource("portal-staging"),
      },
    },
  ],
});
