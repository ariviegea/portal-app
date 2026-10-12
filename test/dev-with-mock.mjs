// Runs the portal on this computer with a stand-in for Azure, so the "Azure
// traffic" section can be seen without deploying. Started by `npm run dev:mock`.
// The npm, Maven and GitHub cards still use the real APIs.
import { spawn } from "node:child_process";
import { MOCK_API_URL, mockAzureEnv } from "./mock-settings.mjs";

// Start the mock (importing it starts it), unless one is already running.
const alreadyRunning = await fetch(`${MOCK_API_URL}/health`).then(
  (response) => response.ok,
  () => false,
);
if (!alreadyRunning) await import("./mock-api.mjs");

const dev = spawn("npx", ["next", "dev"], {
  stdio: "inherit",
  env: { ...process.env, ...mockAzureEnv },
});

dev.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => dev.kill(signal));
}
