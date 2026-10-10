import { afterEach, describe, expect, it } from "vitest";
import { sendJson, startServer, type TestServer } from "@/test-utils/httpServer";
import { getMavenArtifact } from "./mavenArtifactModel";

let server: TestServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe("getMavenArtifact", () => {
  it("maps the first search hit to a portal item", async () => {
    const requests: URL[] = [];
    server = await startServer((req, res) => {
      requests.push(new URL(req.url ?? "", "http://localhost"));
      sendJson(res, {
        response: { docs: [{ g: "org.apache.commons", a: "commons-lang3", latestVersion: "3.14.0" }] },
      });
    });

    await expect(getMavenArtifact(server.url, "org.apache.commons", "commons-lang3")).resolves.toEqual({
      title: "org.apache.commons:commons-lang3 3.14.0",
      detail: "Latest version on Maven Central",
      href: "https://central.sonatype.com/artifact/org.apache.commons/commons-lang3",
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.pathname).toBe("/solrsearch/select");
    expect(requests[0]?.searchParams.get("q")).toBe('g:"org.apache.commons" AND a:"commons-lang3"');
    expect(requests[0]?.searchParams.get("rows")).toBe("1");
    expect(requests[0]?.searchParams.get("wt")).toBe("json");
  });

  it("rejects when the search finds nothing", async () => {
    server = await startServer((_req, res) => sendJson(res, { response: { docs: [] } }));

    await expect(getMavenArtifact(server.url, "org.apache.commons", "commons-lang3")).rejects.toThrow(
      "Maven Central has no artifact org.apache.commons:commons-lang3",
    );
  });

  it("rejects a response with an unexpected shape", async () => {
    server = await startServer((_req, res) => sendJson(res, { error: "maintenance" }));

    await expect(getMavenArtifact(server.url, "org.apache.commons", "commons-lang3")).rejects.toThrow(
      "Unexpected response from Maven Central",
    );
  });
});
