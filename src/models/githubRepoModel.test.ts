import { afterEach, describe, expect, it } from "vitest";
import { sendJson, startServer, type TestServer } from "@/test-utils/httpServer";
import { getGithubRepo } from "./githubRepoModel";

let server: TestServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe("getGithubRepo", () => {
  it("maps a repository to a portal item", async () => {
    const paths: string[] = [];
    server = await startServer((req, res) => {
      paths.push(req.url ?? "");
      sendJson(res, {
        full_name: "vercel/next.js",
        stargazers_count: 120000,
        open_issues_count: 3000,
        html_url: "https://github.com/vercel/next.js",
      });
    });

    await expect(getGithubRepo(server.url, "vercel/next.js")).resolves.toEqual({
      title: "vercel/next.js",
      detail: "120000 stars · 3000 open issues",
      href: "https://github.com/vercel/next.js",
    });
    expect(paths).toEqual(["/repos/vercel/next.js"]);
  });

  it("rejects when GitHub refuses the request", async () => {
    server = await startServer((_req, res) => sendJson(res, { message: "rate limit exceeded" }, 403));

    await expect(getGithubRepo(server.url, "vercel/next.js")).rejects.toThrow("Request failed with status 403");
  });

  it("rejects a link that is not https", async () => {
    server = await startServer((_req, res) =>
      sendJson(res, {
        full_name: "vercel/next.js",
        stargazers_count: 1,
        open_issues_count: 1,
        html_url: "javascript:alert(1)",
      }),
    );

    await expect(getGithubRepo(server.url, "vercel/next.js")).rejects.toThrow("Unexpected response from GitHub");
  });
});
