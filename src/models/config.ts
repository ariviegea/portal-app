import type { PortalConfig } from "./types";

type Env = Record<string, string | undefined>;

function baseUrl(value: string | undefined, fallback: string): string {
  const url = value?.trim() || fallback;
  return url.replace(/\/+$/, "");
}

/** Reads API addresses from the environment, falling back to the public APIs. */
export function loadConfig(env: Env = process.env): PortalConfig {
  return {
    npmApiUrl: baseUrl(env.NPM_API_URL, "https://registry.npmjs.org"),
    mavenApiUrl: baseUrl(env.MAVEN_API_URL, "https://search.maven.org"),
    githubApiUrl: baseUrl(env.GITHUB_API_URL, "https://api.github.com"),
  };
}
