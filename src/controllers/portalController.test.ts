import type http from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PortalConfig } from "@/models/types";
import { clearTokenCache } from "@/models/azureResources/azureIdentityModel";
import { sendJson, startServer, type TestServer } from "@/test-utils/httpServer";
import { getPortalData } from "./portalController";

let server: TestServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
  vi.restoreAllMocks();
  clearTokenCache();
});

const PRODUCTION_ID = "/subscriptions/s/resourceGroups/g/providers/Microsoft.Web/sites/portal-prod";
const STAGING_ID = "/subscriptions/s/resourceGroups/g/providers/Microsoft.Web/sites/portal-staging";

function configFor(baseUrl: string): PortalConfig {
  return {
    npmApiUrl: `${baseUrl}/npm`,
    mavenApiUrl: `${baseUrl}/maven`,
    githubApiUrl: `${baseUrl}/github`,
    // No managed identity and no resource IDs: the Azure sources are left out.
    azure: {
      managementUrl: `${baseUrl}/management`,
      identityEndpoint: undefined,
      identityHeader: undefined,
      productionResourceId: undefined,
      stagingResourceId: undefined,
    },
  };
}

function configWithAzure(baseUrl: string): PortalConfig {
  return {
    ...configFor(baseUrl),
    azure: {
      managementUrl: `${baseUrl}/management`,
      identityEndpoint: `${baseUrl}/identity`,
      identityHeader: "identity-secret",
      productionResourceId: PRODUCTION_ID,
      stagingResourceId: STAGING_ID,
    },
  };
}

/** One server standing in for all three APIs, routed by path prefix. */
function threeApis(options: { githubStatus?: number } = {}): http.RequestListener {
  return (req, res) => {
    const path = req.url ?? "";
    if (path.startsWith("/npm/")) {
      sendJson(res, { name: "next", version: "16.4.0", description: "The React Framework" });
    } else if (path.startsWith("/maven/")) {
      sendJson(res, {
        response: { docs: [{ g: "org.apache.commons", a: "commons-lang3", latestVersion: "3.14.0" }] },
      });
    } else if (path.startsWith("/github/")) {
      sendJson(
        res,
        {
          full_name: "vercel/next.js",
          stargazers_count: 120000,
          open_issues_count: 3000,
          html_url: "https://github.com/vercel/next.js",
        },
        options.githubStatus ?? 200,
      );
    } else if (path.startsWith("/identity")) {
      sendJson(res, { access_token: "token-1", expires_on: String(Math.floor(Date.now() / 1000) + 3600) });
    } else if (path.startsWith(`/management${PRODUCTION_ID}/`)) {
      sendJson(res, {
        value: [
          { name: { value: "Requests" }, timeseries: [{ data: [{ timeStamp: "2026-10-11T10:00:00Z", total: 40 }] }] },
          { name: { value: "Http5xx" }, timeseries: [{ data: [{ timeStamp: "2026-10-11T10:00:00Z", total: 0 }] }] },
          {
            name: { value: "HttpResponseTime" },
            timeseries: [{ data: [{ timeStamp: "2026-10-11T10:00:00Z", average: 0.1 }] }],
          },
        ],
      });
    } else if (path.startsWith(`/management${STAGING_ID}/`)) {
      sendJson(res, { error: { code: "AuthorizationFailed" } }, 403);
    } else {
      sendJson(res, { error: "not found" }, 404);
    }
  };
}

describe("getPortalData", () => {
  it("returns one ok result per source", async () => {
    server = await startServer(threeApis());

    const { sources: results, environments } = await getPortalData(configFor(server.url));

    expect(results.map((result) => result.id)).toEqual(["npm", "maven", "github"]);
    expect(results.map((result) => result.status)).toEqual(["ok", "ok", "ok"]);
    expect(environments).toEqual([]);
    expect(results[0]).toEqual({
      id: "npm",
      label: "npm package",
      status: "ok",
      item: {
        title: "next 16.4.0",
        detail: "The React Framework",
        href: "https://www.npmjs.com/package/next",
      },
    });
  });

  it("keeps working sources when one fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    server = await startServer(threeApis({ githubStatus: 403 }));

    const { sources: results } = await getPortalData(configFor(server.url));

    expect(results[0]?.status).toBe("ok");
    expect(results[1]?.status).toBe("ok");
    expect(results[2]).toEqual({
      id: "github",
      label: "GitHub repository",
      status: "error",
      message: "GitHub repository is unavailable right now.",
    });
  });

  it("reports every source as failed when nothing answers", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    server = await startServer(threeApis());
    const config = configFor(server.url);
    await server.close();
    server = undefined;

    const { sources: results } = await getPortalData(config);

    expect(results).toEqual([
      { id: "npm", label: "npm package", status: "error", message: "npm package is unavailable right now." },
      { id: "maven", label: "Maven artifact", status: "error", message: "Maven artifact is unavailable right now." },
      {
        id: "github",
        label: "GitHub repository",
        status: "error",
        message: "GitHub repository is unavailable right now.",
      },
    ]);
  });

  it("returns the Azure environments separately from the API sources", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    server = await startServer(threeApis());

    const { sources, environments } = await getPortalData(configWithAzure(server.url));

    expect(sources.map((source) => source.id)).toEqual(["npm", "maven", "github"]);
    expect(environments).toEqual([
      {
        id: "production",
        label: "Production",
        status: "ok",
        metrics: { appName: "portal-prod", requests: 40, serverErrors: 0, averageResponseMs: 100 },
      },
      {
        id: "staging",
        label: "Staging",
        status: "error",
        message: "Staging traffic is unavailable right now.",
      },
    ]);
  });

  it("leaves out an Azure environment whose resource ID is not set", async () => {
    server = await startServer(threeApis());
    const config = configWithAzure(server.url);
    config.azure.stagingResourceId = undefined;

    const { environments } = await getPortalData(config);

    expect(environments.map((environment) => environment.id)).toEqual(["production"]);
  });
});
