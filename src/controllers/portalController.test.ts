import type http from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PortalConfig } from "@/models/types";
import { sendJson, startServer, type TestServer } from "@/test-utils/httpServer";
import { getPortalData } from "./portalController";

let server: TestServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
  vi.restoreAllMocks();
});

function configFor(baseUrl: string): PortalConfig {
  return {
    npmApiUrl: `${baseUrl}/npm`,
    mavenApiUrl: `${baseUrl}/maven`,
    githubApiUrl: `${baseUrl}/github`,
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
    } else {
      sendJson(res, { error: "not found" }, 404);
    }
  };
}

describe("getPortalData", () => {
  it("returns one ok result per source", async () => {
    server = await startServer(threeApis());

    const results = await getPortalData(configFor(server.url));

    expect(results.map((result) => result.id)).toEqual(["npm", "maven", "github"]);
    expect(results.map((result) => result.status)).toEqual(["ok", "ok", "ok"]);
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

    const results = await getPortalData(configFor(server.url));

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

    const results = await getPortalData(config);

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
});
