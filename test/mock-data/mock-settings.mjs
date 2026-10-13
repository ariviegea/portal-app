// The values the mock API (mock-api.mjs) and its callers must agree on.
// Everything here is made up for tests; none of it is a real key or ID.
export const MOCK_API_PORT = 4010;
export const MOCK_API_URL = `http://localhost:${MOCK_API_PORT}`;

// The mock's identity endpoint only answers a caller that sends this header,
// and its metrics endpoint only answers a caller that sends this token.
export const IDENTITY_HEADER = "test-identity-header";
export const AZURE_TOKEN = "test-azure-token";

const resourceId = (site) =>
  `/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test/providers/Microsoft.Web/sites/${site}`;

/**
 * Environment variables that point the app at the mock in place of Azure:
 * stand-ins for what Azure provides to a web app with a managed identity.
 */
export const mockAzureEnv = {
  AZURE_MANAGEMENT_URL: `${MOCK_API_URL}/azure/management`,
  IDENTITY_ENDPOINT: `${MOCK_API_URL}/azure/identity`,
  IDENTITY_HEADER,
  AZURE_PRODUCTION_RESOURCE_ID: resourceId("portal-prod"),
  AZURE_STAGING_RESOURCE_ID: resourceId("portal-staging"),
};
