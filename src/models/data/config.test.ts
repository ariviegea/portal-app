import { describe, expect, it } from "vitest";
import { loadConfig } from "./data/config";

describe("loadConfig", () => {
  it("uses the public API addresses when nothing is set", () => {
    expect(loadConfig({})).toEqual({
      npmApiUrl: "https://registry.npmjs.org",
      mavenApiUrl: "https://search.maven.org",
      githubApiUrl: "https://api.github.com",
      azure: {
        managementUrl: "https://management.azure.com",
        identityEndpoint: undefined,
        identityHeader: undefined,
        productionResourceId: undefined,
        stagingResourceId: undefined,
      },
    });
  });

  it("removes a trailing slash from a configured address", () => {
    const config = loadConfig({ NPM_API_URL: "http://localhost:4010/npm/" });

    expect(config.npmApiUrl).toBe("http://localhost:4010/npm");
    expect(config.mavenApiUrl).toBe("https://search.maven.org");
  });

  it("falls back to the default when a variable is empty", () => {
    expect(loadConfig({ MAVEN_API_URL: "" }).mavenApiUrl).toBe("https://search.maven.org");
  });

  it("reads the Azure settings", () => {
    const config = loadConfig({
      AZURE_MANAGEMENT_URL: "http://localhost:4010/azure/management/",
      IDENTITY_ENDPOINT: "http://localhost:4010/azure/identity",
      IDENTITY_HEADER: "header-value",
      AZURE_PRODUCTION_RESOURCE_ID: " /subscriptions/s/resourceGroups/g/providers/Microsoft.Web/sites/prod ",
      AZURE_STAGING_RESOURCE_ID: "",
    });

    expect(config.azure).toEqual({
      managementUrl: "http://localhost:4010/azure/management",
      identityEndpoint: "http://localhost:4010/azure/identity",
      identityHeader: "header-value",
      productionResourceId: "/subscriptions/s/resourceGroups/g/providers/Microsoft.Web/sites/prod",
      stagingResourceId: undefined,
    });
  });
});
