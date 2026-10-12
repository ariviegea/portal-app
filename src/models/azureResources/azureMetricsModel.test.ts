import type http from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { azureConfigFor, tokenAnswer } from "@/test-utils/azure";
import { sendJson, startServer, type TestServer } from "@/test-utils/httpServer";
import { clearTokenCache } from "./azureIdentityModel";
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

/** Stands in for both the identity endpoint and Azure Monitor. */
function azure(metricsBody: unknown, metricsStatus = 200, seen: http.IncomingMessage[] = []): http.RequestListener {
  return (req, res) => {
    if (req.url?.startsWith("/identity")) {
      sendJson(res, tokenAnswer());
    } else {
      seen.push(req);
      sendJson(res, metricsBody, metricsStatus);
    }
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

    expect(seen).toHaveLength(1);
    const url = new URL(seen[0]?.url ?? "", server.url);
    expect(url.pathname).toBe(`/management${RESOURCE_ID}/providers/Microsoft.Insights/metrics`);
    expect(url.searchParams.get("api-version")).toBe("2023-10-01");
    expect(url.searchParams.get("metricnames")).toBe("Requests,Http5xx,HttpResponseTime");
    expect(url.searchParams.get("aggregation")).toBe("total,average");
    expect(url.searchParams.get("interval")).toBe("PT1M");
    const [start, end] = (url.searchParams.get("timespan") ?? "").split("/");
    expect(Date.parse(end ?? "") - Date.parse(start ?? "")).toBe(60 * 60 * 1000);
    expect(seen[0]?.headers.authorization).toBe("Bearer token-1");
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
