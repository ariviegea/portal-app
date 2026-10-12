import { afterEach, describe, expect, it } from "vitest";
import { sendJson, startServer, type TestServer } from "@/test-utils/httpServer";
import { fetchJson } from "./fetchJson";

let server: TestServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
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
