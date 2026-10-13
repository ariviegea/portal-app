import { afterEach, describe, expect, it } from "vitest";
import { azureConfigFor, tokenAnswer } from "@/test-utils/azure";
import { sendJson, startServer, type TestServer } from "@/test-utils/httpServer";
import { clearTokenCache, getManagementToken } from "./azureIdentityModel";
import type { AzureConfig } from "../types";

let server: TestServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
  clearTokenCache();
});

describe("getManagementToken", () => {
  it("asks the identity endpoint for a management token", async () => {
    const requests: { url: string; header: string | string[] | undefined }[] = [];
    server = await startServer((req, res) => {
      requests.push({ url: req.url ?? "", header: req.headers["x-identity-header"] });
      sendJson(res, tokenAnswer());
    });

    await expect(getManagementToken(azureConfigFor(server.url))).resolves.toBe("token-1");
    expect(requests).toEqual([
      {
        url: "/identity?resource=https%3A%2F%2Fmanagement.azure.com%2F&api-version=2019-08-01",
        header: "identity-secret",
      },
    ]);
  });

  it("reuses a token until it is close to expiring", async () => {
    let count = 0;
    server = await startServer((_req, res) => {
      count += 1;
      sendJson(res, tokenAnswer(`token-${count}`));
    });
    const azure = azureConfigFor(server.url);

    await expect(getManagementToken(azure)).resolves.toBe("token-1");
    await expect(getManagementToken(azure)).resolves.toBe("token-1");
    expect(count).toBe(1);
  });

  it("asks again when the token is about to expire", async () => {
    let count = 0;
    server = await startServer((_req, res) => {
      count += 1;
      sendJson(res, tokenAnswer(`token-${count}`, 60));
    });
    const azure = azureConfigFor(server.url);

    await expect(getManagementToken(azure)).resolves.toBe("token-1");
    await expect(getManagementToken(azure)).resolves.toBe("token-2");
  });

  it("rejects when the app has no managed identity", async () => {
    const azure: AzureConfig = { ...azureConfigFor("http://127.0.0.1:1"), identityEndpoint: undefined };

    await expect(getManagementToken(azure)).rejects.toThrow("Azure managed identity is not available");
  });

  it("rejects when the identity endpoint refuses the request", async () => {
    server = await startServer((_req, res) => sendJson(res, { error: "forbidden" }, 403));

    await expect(getManagementToken(azureConfigFor(server.url))).rejects.toThrow("Request failed with status 403");
  });

  it("rejects an answer without a token", async () => {
    server = await startServer((_req, res) => sendJson(res, { expires_on: tokenAnswer().expires_on }));

    await expect(getManagementToken(azureConfigFor(server.url))).rejects.toThrow(
      "Unexpected response from the Azure identity endpoint",
    );
  });
});
