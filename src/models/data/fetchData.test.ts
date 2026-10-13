import { afterEach, describe, expect, it } from "vitest";
import { sendJson, startServer, type TestServer } from "@/test-utils/httpServer";
import { fetchJson, fetchPortalItem } from "./fetchData";

let server: TestServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

const toItem = (data: Record<string, unknown>) =>
  typeof data.name === "string" ? { title: data.name, detail: "A detail", href: "https://example.com" } : undefined;

describe("fetchPortalItem", () => {
  it("fetches the URL and returns the card built from the answer", async () => {
    const paths: string[] = [];
    server = await startServer((req, res) => {
      paths.push(req.url ?? "");
      sendJson(res, { name: "next" });
    });

    await expect(fetchPortalItem(`${server.url}/packages/next`, "Example API", toItem)).resolves.toEqual({
      title: "next",
      detail: "A detail",
      href: "https://example.com",
    });
    expect(paths).toEqual(["/packages/next"]);
  });

  it("rejects, naming the API, when the answer cannot be turned into a card", async () => {
    server = await startServer((_req, res) => sendJson(res, { unexpected: true }));

    await expect(fetchPortalItem(server.url, "Example API", toItem)).rejects.toThrow(
      "Unexpected response from Example API",
    );
  });

  it("rejects an answer that is not an object without calling the converter", async () => {
    server = await startServer((_req, res) => sendJson(res, ["a", "list"]));
    let called = false;

    await expect(
      fetchPortalItem(server.url, "Example API", () => {
        called = true;
        return undefined;
      }),
    ).rejects.toThrow("Unexpected response from Example API");
    expect(called).toBe(false);
  });

  it("passes on a failed request unchanged", async () => {
    server = await startServer((_req, res) => sendJson(res, { message: "down" }, 503));

    await expect(fetchPortalItem(server.url, "Example API", toItem)).rejects.toThrow("Request failed with status 503");
  });

  it("lets the converter give its own reason by throwing", async () => {
    server = await startServer((_req, res) => sendJson(res, { results: [] }));

    await expect(
      fetchPortalItem(server.url, "Example API", () => {
        throw new Error("Example API has no such package");
      }),
    ).rejects.toThrow("Example API has no such package");
  });
});


describe("fetchJson", () => {
  it("returns parsed JSON", async () => {
    server = await startServer((_req, res) => sendJson(res, { ok: true }));

    await expect(fetchJson(server.url)).resolves.toEqual({ ok: true });
  });

  it("sends extra request headers", async () => {
    server = await startServer((req, res) =>
      sendJson(res, { authorization: req.headers.authorization, accept: req.headers.accept }),
    );

    await expect(fetchJson(server.url, { headers: { Authorization: "Bearer abc" } })).resolves.toEqual({
      authorization: "Bearer abc",
      accept: "application/json",
    });
  });

  it("rejects on a non-2xx status", async () => {
    server = await startServer((_req, res) => sendJson(res, { error: "down" }, 503));

    await expect(fetchJson(server.url)).rejects.toThrow("Request failed with status 503");
  });

  it("keeps the service's explanation of a refusal, for the server log", async () => {
    server = await startServer((_req, res) =>
      sendJson(res, { error: { code: "BadRequest", message: "Aggregation not supported" } }, 400),
    );

    const failure = await fetchJson(server.url).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe("Request failed with status 400");
    expect((failure as Error).cause).toBe('{"error":{"code":"BadRequest","message":"Aggregation not supported"}}');
  });

  it("rejects when the body is not JSON", async () => {
    server = await startServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html>Service page</html>");
    });

    await expect(fetchJson(server.url)).rejects.toThrow("Response was not valid JSON");
  });

  it("times out", async () => {
    server = await startServer((_req, res) => {
      setTimeout(() => sendJson(res, { ok: true }), 300);
    });

    await expect(fetchJson(server.url, { timeoutMs: 50 })).rejects.toThrow("Request timed out");
  });
});
