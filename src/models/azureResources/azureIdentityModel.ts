import { fetchJson } from "../data/fetchJson";
import { isRecord } from "../isRecord";
import type { AzureConfig } from "./types";

// The audience Azure Resource Manager (which serves Azure Monitor) expects in a token.
const MANAGEMENT_RESOURCE = "https://management.azure.com/";
// A token this close to expiring is replaced, so it cannot run out mid-request.
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

let cached: { endpoint: string; token: string; expiresAt: number } | undefined;

/**
 * Returns a token for Azure's management API, issued to this app's managed
 * identity. Works only on Azure, where the platform provides the identity
 * endpoint; there is no password or key involved. The token is kept in
 * memory and never logged.
 */
export async function getManagementToken(azure: AzureConfig): Promise<string> {
  const { identityEndpoint, identityHeader } = azure;
  if (!identityEndpoint || !identityHeader) {
    throw new Error("Azure managed identity is not available");
  }

  if (cached && cached.endpoint === identityEndpoint && cached.expiresAt - EXPIRY_MARGIN_MS > Date.now()) {
    return cached.token;
  }

  const query = new URLSearchParams({ resource: MANAGEMENT_RESOURCE, "api-version": "2019-08-01" });
  const data = await fetchJson(`${identityEndpoint}?${query}`, {
    headers: { "X-IDENTITY-HEADER": identityHeader },
  });

  // expires_on is the expiry time in seconds since 1970, sent as a string.
  const expiresAt = isRecord(data) ? Number(data.expires_on) * 1000 : Number.NaN;
  if (!isRecord(data) || typeof data.access_token !== "string" || !data.access_token || !Number.isFinite(expiresAt)) {
    throw new Error("Unexpected response from the Azure identity endpoint");
  }

  cached = { endpoint: identityEndpoint, token: data.access_token, expiresAt };
  return data.access_token;
}

/** Forgets the stored token. Used by tests. */
export function clearTokenCache(): void {
  cached = undefined;
}
