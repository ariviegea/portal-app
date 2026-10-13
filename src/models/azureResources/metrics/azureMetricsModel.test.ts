import type http from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { azureConfigFor, tokenAnswer } from "@/test-utils/azure";
import { sendJson, startServer, type TestServer } from "@/test-utils/httpServer";
import { clearTokenCache } from "../identity/azureIdentityModel";
import { getAppMetrics } from "./azureMetricsModel";

const RESOURCE_ID = "/subscriptions/sub-1/resourceGroups/rg-1/providers/Microsoft.Web/sites/my-app";

let server: TestServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
  clearTokenCache();
});

function azureFor(baseUrl: string) {
  return azureConfigFor(baseUrl, { productionResourceId: RESOURCE_ID });
}

type Point = { timeStamp: string; total?: number; average?: number };

function metric(name: string, data: Point[] | null) {
  return { name: { value: name }, timeseries: data ? [{ data }] : [] };
}

// Which aggregation each metric offers. Azure Monitor refuses a request (400)
// that asks any metric for one it does not offer; staging showed this on 2026-10-12.
const OFFERED: Record<string, string> = { Requests: "total", Http5xx: "total", HttpResponseTime: "average" };

/**
 * Stands in for both the identity endpoint and Azure Monitor. Like Azure
 * Monitor, it answers only with the metrics that were asked for, and refuses
 * a request that asks a metric for an aggregation it does not offer.
 */
function azure(metricsBody: unknown, metricsStatus = 200, seen: http.IncomingMessage[] = []): http.RequestListener {
  return (req, res) => {
    if (req.url?.startsWith("/identity")) {
      sendJson(res, tokenAnswer());
      return;
    }
    seen.push(req);

    const query = new URL(req.url ?? "", "http://test").searchParams;
    const names = (query.get("metricnames") ?? "").split(",");
    const aggregations = (query.get("aggregation") ?? "").split(",");
    if (names.some((name) => aggregations.some((aggregation) => aggregation !== OFFERED[name]))) {
      sendJson(res, { code: "BadRequest", message: "Requested aggregation is not supported by the metric" }, 400);
      return;
    }

    const all = metricsBody as { value?: { name: { value: string } }[] };
    const body = Array.isArray(all.value)
      ? { value: all.value.filter((entry) => names.includes(entry.name.value)) }
      : metricsBody;
    sendJson(res, body, metricsStatus);
  };
}

describe("getAppMetrics", () => {
  it("maps the last hour of metrics to a portal item", async () => {
    const seen: http.IncomingMessage[] = [];
    server = await startServer(
      azure(
        {
          value: [
            metric("Requests", [
              { timeStamp: "2026-10-11T10:00:00Z", total: 100 },
              { timeStamp: "2026-10-11T10:01:00Z", total: 20 },
              { timeStamp: "2026-10-11T10:02:00Z", total: 0 },
            ]),
            metric("Http5xx", [
              { timeStamp: "2026-10-11T10:00:00Z", total: 2 },
              { timeStamp: "2026-10-11T10:01:00Z", total: 0 },
            ]),
            metric("HttpResponseTime", [
              { timeStamp: "2026-10-11T10:00:00Z", average: 0.2 },
              { timeStamp: "2026-10-11T10:01:00Z", average: 0.5 },
              { timeStamp: "2026-10-11T10:02:00Z", average: 0 },
            ]),
          ],
        },
        200,
        seen,
      ),
    );

    await expect(getAppMetrics(azureFor(server.url), RESOURCE_ID)).resolves.toEqual({
      appName: "my-app",
      requests: 120,
      serverErrors: 2,
      // (100 × 0.2 s + 20 × 0.5 s) ÷ 120 requests = 0.25 s
      averageResponseMs: 250,
    });

    // Counts and timings are asked for separately, each with the aggregation its metrics offer.
    const requests = seen.map((request) => new URL(request.url ?? "", server?.url));
    expect(requests.map((url) => [url.searchParams.get("metricnames"), url.searchParams.get("aggregation")]).sort()).toEqual([
      ["HttpResponseTime", "average"],
      ["Requests,Http5xx", "total"],
    ]);
    for (const [index, url] of requests.entries()) {
      expect(url.pathname).toBe(`/management${RESOURCE_ID}/providers/Microsoft.Insights/metrics`);
      expect(url.searchParams.get("api-version")).toBe("2023-10-01");
      expect(url.searchParams.get("interval")).toBe("PT1M");
      const [start, end] = (url.searchParams.get("timespan") ?? "").split("/");
      expect(Date.parse(end ?? "") - Date.parse(start ?? "")).toBe(60 * 60 * 1000);
      expect(seen[index]?.headers.authorization).toBe("Bearer token-1");
    }
  });

  it("reports an hour without traffic", async () => {
    server = await startServer(
      azure({ value: [metric("Requests", null), metric("Http5xx", null), metric("HttpResponseTime", null)] }),
    );

    await expect(getAppMetrics(azureFor(server.url), RESOURCE_ID)).resolves.toEqual({
      appName: "my-app",
      requests: 0,
      serverErrors: 0,
      averageResponseMs: null,
    });
  });

  it("rejects when the identity may not read the metrics", async () => {
    server = await startServer(azure({ error: { code: "AuthorizationFailed" } }, 403));

    await expect(getAppMetrics(azureFor(server.url), RESOURCE_ID)).rejects.toThrow("Request failed with status 403");
  });

  it("rejects an answer that lacks a metric", async () => {
    server = await startServer(azure({ value: [metric("Requests", [])] }));

    await expect(getAppMetrics(azureFor(server.url), RESOURCE_ID)).rejects.toThrow(
      "Unexpected response from Azure Monitor",
    );
  });

  it("rejects a resource ID that is not an Azure resource path", async () => {
    server = await startServer(azure({ value: [] }));

    await expect(getAppMetrics(azureFor(server.url), "my-app")).rejects.toThrow("Invalid Azure resource ID");
  });
});
