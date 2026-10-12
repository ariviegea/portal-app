// Local stand-in for the external APIs (and Azure), used only by the Playwright tests.
// playwright.config.ts starts it and points the app's *_API_URL variables here.
import http from "node:http";

const PORT = 4010;
// Must match the values in playwright.config.ts.
const IDENTITY_HEADER = "test-identity-header";
const AZURE_TOKEN = "test-azure-token";
let npmRequests = 0;

function azureMetric(name, field, value) {
  return { name: { value: name }, timeseries: [{ data: [{ timeStamp: "2026-01-01T00:00:00Z", [field]: value }] }] };
}

function sendJson(res, body, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  } else if (pathname === "/npm/next/latest") {
    // The version changes on every request, so a test can tell fresh data from a replay.
    npmRequests += 1;
    sendJson(res, { name: "next", version: `1.0.${npmRequests}`, description: "The React Framework" });
  } else if (pathname === "/maven/solrsearch/select") {
    sendJson(res, {
      response: { docs: [{ g: "org.apache.commons", a: "commons-lang3", latestVersion: "3.14.0" }] },
    });
  } else if (pathname === "/azure/identity") {
    // Like Azure, hands out a token only to a caller that knows the identity header.
    if (req.headers["x-identity-header"] !== IDENTITY_HEADER) {
      sendJson(res, { message: "Forbidden" }, 403);
    } else {
      sendJson(res, { access_token: AZURE_TOKEN, expires_on: String(Math.floor(Date.now() / 1000) + 3600) });
    }
  } else if (pathname.startsWith("/azure/management/") && pathname.endsWith("/providers/Microsoft.Insights/metrics")) {
    if (req.headers.authorization !== `Bearer ${AZURE_TOKEN}`) {
      sendJson(res, { error: { code: "AuthenticationFailed" } }, 401);
    } else {
      const production = pathname.includes("/sites/portal-prod/");
      sendJson(res, {
        value: [
          azureMetric("Requests", "total", production ? 120 : 8),
          azureMetric("Http5xx", "total", production ? 2 : 0),
          azureMetric("HttpResponseTime", "average", production ? 0.25 : 0.1),
        ],
      });
    }
  } else if (pathname.startsWith("/github/")) {
    // Always failing, to exercise the portal's "unavailable" state.
    sendJson(res, { message: "Service unavailable" }, 503);
  } else {
    sendJson(res, { message: "Not found" }, 404);
  }
});

server.listen(PORT, () => {
  console.log(`Mock API listening on http://localhost:${PORT}`);
});
