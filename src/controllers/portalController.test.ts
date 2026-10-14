import type http from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PortalConfig } from "@/models/azureResources/types";
import { clearTokenCache } from "@/models/azureResources/identity/azureIdentityModel";
import { azureConfigFor, tokenAnswer } from "@/test-utils/azure";
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
    // No managed identity: the Azure environments are left out.
    azure: azureConfigFor(baseUrl, { identityEndpoint: undefined, identityHeader: undefined }),
  };
}

function configWithAzure(baseUrl: string): PortalConfig {
  return {
    ...configFor(baseUrl),
    azure: azureConfigFor(baseUrl, { productionResourceId: PRODUCTION_ID, stagingResourceId: STAGING_ID }),
  };
}

/**
 * One server standing in for all three APIs, routed by path prefix. Every
 * request's path is added to `realPath`, when given, so a test can check what was asked for.
 */
function threeApis(options: { githubStatus?: number; realPath?: string[] } = {}): http.RequestListener {
  return (req, res) => {
    const path = req.url ?? "";
    options.realPath?.push(path);
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
      sendJson(res, tokenAnswer());
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
  // These pin down what the portal shows. Changing a package, artifact or
  // repository in portalController.ts should make one of them fail.
  describe("asks each API for the item the portal shows", () => {
    async function requestedPaths(prefix: string): Promise<string[]> {
      const realPath: string[] = [];
      server = await startServer(threeApis({ realPath }));
      await getPortalData(configFor(server.url));
      return realPath.filter((path) => path.startsWith(prefix));
    }

    it("npm: the latest release of next", async () => {
      expect(await requestedPaths("/npm/")).toEqual(["/npm/next/latest"]);
    });

    it("Maven Central: org.apache.commons:commons-lang3", async () => {
      const paths = await requestedPaths("/maven/");

      expect(paths).toHaveLength(1);
      const query = new URL(paths[0] ?? "", "http://test").searchParams;
      expect(query.get("q")).toBe('g:"org.apache.commons" AND a:"commons-lang3"');
    });

    it("GitHub: the portal's own repository, vercel/next.js", async () => {
      expect(await requestedPaths("/github/")).toEqual(["/github/repos/ariviegea/portal-app"]);
    });
  });

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
