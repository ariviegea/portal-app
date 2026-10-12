import { getManagementToken } from "./azureIdentityModel";
import { fetchJson } from "../data/fetchJson";
import { isRecord } from "../isRecord";
import type { AppMetrics, AzureConfig } from "./types";

const HOUR_MS = 60 * 60 * 1000;

/** One value per minute, keyed by the minute's timestamp. Minutes Azure sent no value for are absent. */
type Series = Map<string, number>;

/** Reads one metric from Azure Monitor's answer, adding up the app's instances. */
function readSeries(metrics: unknown[], name: string, field: "total" | "average"): Series {
  const metric = metrics.find((entry) => isRecord(entry) && isRecord(entry.name) && entry.name.value === name);
  if (!isRecord(metric) || !Array.isArray(metric.timeseries)) {
    throw new Error("Unexpected response from Azure Monitor");
  }

  const series: Series = new Map();
  for (const instance of metric.timeseries) {
    const points = isRecord(instance) && Array.isArray(instance.data) ? instance.data : [];
    for (const point of points) {
      if (!isRecord(point) || typeof point.timeStamp !== "string") continue;
      const value = point[field];
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      series.set(point.timeStamp, (series.get(point.timeStamp) ?? 0) + value);
    }
  }
  return series;
}

function sum(series: Series): number {
  let total = 0;
  for (const value of series.values()) total += value;
  return total;
}

/**
 * Average response time in milliseconds, or null when there were no requests.
 * Each minute's average counts in proportion to that minute's requests, so a
 * quiet minute does not weigh as much as a busy one.
 */
function averageResponseMs(requestsPerMinute: Series, responseSecondsPerMinute: Series): number | null {
  let weightedSeconds = 0;
  let weightedRequests = 0;
  for (const [minute, seconds] of responseSecondsPerMinute) {
    const requests = requestsPerMinute.get(minute) ?? 0;
    weightedSeconds += seconds * requests;
    weightedRequests += requests;
  }
  return weightedRequests > 0 ? Math.round((weightedSeconds / weightedRequests) * 1000) : null;
}

/**
 * Asks Azure Monitor for some of the web app's metrics over the last hour, one
 * value per minute. Azure refuses the whole request if any of the metrics
 * does not offer the aggregation asked for, so metrics that are counted
 * ("total") and metrics that are averaged are fetched separately.
 */
async function fetchLastHour(
  azure: AzureConfig,
  resourceId: string,
  token: string,
  metricNames: string[],
  aggregation: "total" | "average",
): Promise<unknown[]> {
  const end = new Date();
  const start = new Date(end.getTime() - HOUR_MS);
  const query = new URLSearchParams({
    "api-version": "2023-10-01",
    metricnames: metricNames.join(","),
    aggregation,
    interval: "PT1M",
    timespan: `${start.toISOString()}/${end.toISOString()}`,
  });
  const data = await fetchJson(`${azure.managementUrl}${resourceId}/providers/Microsoft.Insights/metrics?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!isRecord(data) || !Array.isArray(data.value)) {
    throw new Error("Unexpected response from Azure Monitor");
  }
  return data.value;
}

/**
 * Last hour's traffic for one Azure web app, from Azure Monitor: requests,
 * server errors and average response time. `resourceId` is the web app's
 * Azure Resource ID ("/subscriptions/…/sites/<name>").
 */
export async function getAppMetrics(azure: AzureConfig, resourceId: string): Promise<AppMetrics> {
  if (!resourceId.startsWith("/subscriptions/")) {
    throw new Error("Invalid Azure resource ID");
  }

  const token = await getManagementToken(azure);
  const [counts, timings] = await Promise.all([
    fetchLastHour(azure, resourceId, token, ["Requests", "Http5xx"], "total"),
    fetchLastHour(azure, resourceId, token, ["HttpResponseTime"], "average"),
  ]);
  const requestsPerMinute = readSeries(counts, "Requests", "total");
  const errorsPerMinute = readSeries(counts, "Http5xx", "total");
  const responseSecondsPerMinute = readSeries(timings, "HttpResponseTime", "average");

  return {
    appName: resourceId.slice(resourceId.lastIndexOf("/") + 1),
    requests: Math.round(sum(requestsPerMinute)),
    serverErrors: Math.round(sum(errorsPerMinute)),
    averageResponseMs: averageResponseMs(requestsPerMinute, responseSecondsPerMinute),
  };
}
