import { describe, expect, it } from "vitest";
import { loadConfig } from "./config";

describe("loadConfig", () => {
  it("uses the public API addresses when nothing is set", () => {
    expect(loadConfig({})).toEqual({
      npmApiUrl: "https://registry.npmjs.org",
      mavenApiUrl: "https://search.maven.org",
      githubApiUrl: "https://api.github.com",
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
});
