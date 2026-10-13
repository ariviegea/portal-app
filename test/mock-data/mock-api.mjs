// Local stand-in for the external APIs (and Azure), used only by the Playwright tests.
// playwright.config.ts starts it and points the app's *_API_URL variables here.
import http from "node:http";
import { AZURE_TOKEN, IDENTITY_HEADER, MOCK_API_PORT as PORT } from "./mock-settings.mjs";

let npmRequests = 0;

// The aggregation each metric offers, and its made-up value per environment.
const AZURE_METRICS = {
  Requests: { offers: "total", production: 120, staging: 8 },
  Http5xx: { offers: "total", production: 2, staging: 0 },
  HttpResponseTime: { offers: "average", production: 0.25, staging: 0.1 },
};

/**
 * Answers like Azure Monitor: only the metrics asked for, and a refusal (400)
 * when a metric is asked for an aggregation it does not offer.
 */
function azureMetricsAnswer(query, environment) {
  const names = (query.get("metricnames") ?? "").split(",");
  const aggregations = (query.get("aggregation") ?? "").split(",");
  const supported = names.every(
    (name) => AZURE_METRICS[name] && aggregations.every((aggregation) => aggregation === AZURE_METRICS[name].offers),
  );
  if (!supported) {
    return { status: 400, body: { code: "BadRequest", message: "Requested aggregation is not supported by the metric" } };
  }
  return {
    status: 200,
    body: {
      value: names.map((name) => ({
        name: { value: name },
        timeseries: [
          { data: [{ timeStamp: "2026-01-01T00:00:00Z", [AZURE_METRICS[name].offers]: AZURE_METRICS[name][environment] }] },
        ],
      })),
    },
  };
}

function sendJson(res, body, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const { pathname, searchParams } = new URL(req.url ?? "/", `http://localhost:${PORT}`);

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
      const environment = pathname.includes("/sites/portal-prod/") ? "production" : "staging";
      const { status, body } = azureMetricsAnswer(searchParams, environment);
      sendJson(res, body, status);
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
