import type { AzureConfig } from "@/models/azureResources/types";

/**
 * Azure settings pointing at a test server: the identity endpoint under
 * /identity and Azure Monitor under /management. No resource IDs unless given.
 */
export function azureConfigFor(baseUrl: string, overrides: Partial<AzureConfig> = {}): AzureConfig {
  return {
    managementUrl: `${baseUrl}/management`,
    identityEndpoint: `${baseUrl}/identity`,
    identityHeader: "identity-secret",
    productionResourceId: undefined,
    stagingResourceId: undefined,
    ...overrides,
  };
}

/** What the identity endpoint answers: a token and when it expires, counted from now. */
export function tokenAnswer(token = "token-1", expiresInSeconds = 3600) {
  return { access_token: token, expires_on: String(Math.floor(Date.now() / 1000) + expiresInSeconds) };
}
