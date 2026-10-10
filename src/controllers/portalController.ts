import { loadConfig } from "@/models/config";
import { getGithubRepo } from "@/models/githubRepoModel";
import { getMavenArtifact } from "@/models/mavenArtifactModel";
import { getNpmPackage } from "@/models/npmPackageModel";
import type { PortalConfig, PortalItem, SourceId, SourceResult } from "@/models/types";

type Source = {
  id: SourceId;
  label: string;
  load(config: PortalConfig): Promise<PortalItem>;
};

// To show another API on the portal, add its model and one entry here.
const sources: Source[] = [
  {
    id: "npm",
    label: "npm package",
    load: (config) => getNpmPackage(config.npmApiUrl, "next"),
  },
  {
    id: "maven",
    label: "Maven artifact",
    load: (config) => getMavenArtifact(config.mavenApiUrl, "org.apache.commons", "commons-lang3"),
  },
  {
    id: "github",
    label: "GitHub repository",
    load: (config) => getGithubRepo(config.githubApiUrl, "vercel/next.js"),
  },
];

/**
 * Loads every source at once. Never rejects: a source that fails becomes an
 * "error" result so the others can still be shown.
 */
export async function getPortalData(config: PortalConfig = loadConfig()): Promise<SourceResult[]> {
  const settled = await Promise.allSettled(sources.map((source) => source.load(config)));

  return sources.map(({ id, label }, index): SourceResult => {
    const outcome = settled[index];
    if (outcome?.status === "fulfilled") {
      return { id, label, status: "ok", item: outcome.value };
    }
    console.error(`[portal] ${label} failed:`, outcome?.reason);
    return { id, label, status: "error", message: `${label} is unavailable right now.` };
  });
}
