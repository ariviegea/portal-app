import { afterEach, describe, expect, it } from "vitest";
import { sendJson, startServer, type TestServer } from "@/test-utils/httpServer";
import { clearTokenCache, getManagementToken } from "./azureIdentityModel";
import type { AzureConfig } from "../types";

let server: TestServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
  clearTokenCache();
});

function azureFor(baseUrl: string): AzureConfig {
  return {
    managementUrl: `${baseUrl}/management`,
    identityEndpoint: `${baseUrl}/identity`,
    identityHeader: "identity-secret",
    productionResourceId: undefined,
    stagingResourceId: undefined,
  };
}

function inSeconds(seconds: number): string {
  return String(Math.floor(Date.now() / 1000) + seconds);
}

describe("getManagementToken", () => {
  it("asks the identity endpoint for a management token", async () => {
    const requests: { url: string; header: string | string[] | undefined }[] = [];
    server = await startServer((req, res) => {
      requests.push({ url: req.url ?? "", header: req.headers["x-identity-header"] });
      sendJson(res, { access_token: "token-1", expires_on: inSeconds(3600) });
    });

    await expect(getManagementToken(azureFor(server.url))).resolves.toBe("token-1");
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
      sendJson(res, { access_token: `token-${count}`, expires_on: inSeconds(3600) });
    });
    const azure = azureFor(server.url);

    await expect(getManagementToken(azure)).resolves.toBe("token-1");
    await expect(getManagementToken(azure)).resolves.toBe("token-1");
    expect(count).toBe(1);
  });

  it("asks again when the token is about to expire", async () => {
    let count = 0;
    server = await startServer((_req, res) => {
      count += 1;
      sendJson(res, { access_token: `token-${count}`, expires_on: inSeconds(60) });
    });
    const azure = azureFor(server.url);

    await expect(getManagementToken(azure)).resolves.toBe("token-1");
    await expect(getManagementToken(azure)).resolves.toBe("token-2");
  });

  it("rejects when the app has no managed identity", async () => {
    const azure: AzureConfig = { ...azureFor("http://127.0.0.1:1"), identityEndpoint: undefined };

    await expect(getManagementToken(azure)).rejects.toThrow("Azure managed identity is not available");
  });

  it("rejects when the identity endpoint refuses the request", async () => {
    server = await startServer((_req, res) => sendJson(res, { error: "forbidden" }, 403));

    await expect(getManagementToken(azureFor(server.url))).rejects.toThrow("Request failed with status 403");
  });

  it("rejects an answer without a token", async () => {
    server = await startServer((_req, res) => sendJson(res, { expires_on: inSeconds(3600) }));

    await expect(getManagementToken(azureFor(server.url))).rejects.toThrow(
      "Unexpected response from the Azure identity endpoint",
    );
  });
});
