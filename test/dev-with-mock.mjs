// Runs the portal on this computer with a stand-in for Azure, so the "Azure
// traffic" section can be seen without deploying. Started by `npm run dev:mock`.
// The npm, Maven and GitHub cards still use the real APIs.
import { spawn } from "node:child_process";

const mockApi = "http://localhost:4010";
// Start the mock (importing it starts it), unless one is already running.
const alreadyRunning = await fetch(`${mockApi}/health`).then(
  (response) => response.ok,
  () => false,
);
if (!alreadyRunning) await import("./mock-api.mjs");

const mockAzure = `${mockApi}/azure`;
const resourceId = (site) =>
  `/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test/providers/Microsoft.Web/sites/${site}`;

const dev = spawn("npx", ["next", "dev"], {
  stdio: "inherit",
  env: {
    ...process.env,
    AZURE_MANAGEMENT_URL: `${mockAzure}/management`,
    IDENTITY_ENDPOINT: `${mockAzure}/identity`,
    // Must match IDENTITY_HEADER in mock-api.mjs.
    IDENTITY_HEADER: "test-identity-header",
    AZURE_PRODUCTION_RESOURCE_ID: resourceId("portal-prod"),
    AZURE_STAGING_RESOURCE_ID: resourceId("portal-staging"),
  },
});

dev.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => dev.kill(signal));
}
