import { afterEach, describe, expect, it } from "vitest";
import { sendJson, startServer, type TestServer } from "@/test-utils/httpServer";
import { getNpmPackage } from "./npmPackageModel";

let server: TestServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe("getNpmPackage", () => {
  it("maps the latest release to a portal item", async () => {
    const paths: string[] = [];
    server = await startServer((req, res) => {
      paths.push(req.url ?? "");
      sendJson(res, { name: "next", version: "16.4.0", description: "The React Framework" });
    });

    await expect(getNpmPackage(server.url, "next")).resolves.toEqual({
      title: "next 16.4.0",
      detail: "The React Framework",
      href: "https://www.npmjs.com/package/next",
    });
    expect(paths).toEqual(["/next/latest"]);
  });

  it("rejects a response without a version", async () => {
    server = await startServer((_req, res) => sendJson(res, { name: "next" }));

    await expect(getNpmPackage(server.url, "next")).rejects.toThrow("Unexpected response from npm");
  });
});
