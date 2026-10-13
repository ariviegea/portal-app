import type { PortalConfig } from "../azureResources/types";

type Env = Record<string, string | undefined>;

function baseUrl(value: string | undefined, fallback: string): string {
  const url = value?.trim() || fallback;
  return url.replace(/\/+$/, "");
}

function optional(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

/** Reads API addresses from the environment, falling back to the public APIs. */
export function loadConfig(env: Env = process.env): PortalConfig {
  return {
    npmApiUrl: baseUrl(env.NPM_API_URL, "https://registry.npmjs.org"),
    mavenApiUrl: baseUrl(env.MAVEN_API_URL, "https://search.maven.org"),
    githubApiUrl: baseUrl(env.GITHUB_API_URL, "https://api.github.com"),
    azure: {
      managementUrl: baseUrl(env.AZURE_MANAGEMENT_URL, "https://management.azure.com"),
      identityEndpoint: optional(env.IDENTITY_ENDPOINT),
      identityHeader: optional(env.IDENTITY_HEADER),
      productionResourceId: optional(env.AZURE_PRODUCTION_RESOURCE_ID),
      stagingResourceId: optional(env.AZURE_STAGING_RESOURCE_ID),
    },
  };
}

/** Whether a value is a plain object with named fields (not null, not a list). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
