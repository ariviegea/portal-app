import { getAppMetrics } from "@/models/azureResources/azureMetricsModel";
import { loadConfig } from "@/models/config";
import { getGithubRepo } from "@/models/githubRepoModel";
import { getMavenArtifact } from "@/models/mavenArtifactModel";
import { getNpmPackage } from "@/models/npmPackageModel";
import type {
  AzureConfig,
  EnvironmentId,
  EnvironmentResult,
  PortalConfig,
  PortalData,
  PortalItem,
  SourceId,
  SourceResult,
} from "@/models/types";

type Source = {
  id: SourceId;
  label: string;
  load(config: PortalConfig): Promise<PortalItem>;
};

type Environment = {
  id: EnvironmentId;
  label: string;
  resourceId(azure: AzureConfig): string | undefined;
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

// The Azure web apps whose traffic the portal can show, in the order of the toggle.
const environments: Environment[] = [
  { id: "production", label: "Production", resourceId: (azure) => azure.productionResourceId },
  { id: "staging", label: "Staging", resourceId: (azure) => azure.stagingResourceId },
];

/**
 * Loads every source and every Azure environment at once. Never rejects: one
 * that fails becomes an "error" result so the others can still be shown.
 *
 * An environment is left out, rather than shown as failed, where the app has
 * no managed identity or the environment's resource ID is not set. That is
 * the case everywhere except on Azure.
 */
export async function getPortalData(config: PortalConfig = loadConfig()): Promise<PortalData> {
  const { azure } = config;
  const hasIdentity = Boolean(azure.identityEndpoint && azure.identityHeader);
  const configured = environments.flatMap((environment) => {
    const resourceId = environment.resourceId(azure);
    return hasIdentity && resourceId ? [{ ...environment, resourceId }] : [];
  });

  const [sourceOutcomes, environmentOutcomes] = await Promise.all([
    Promise.allSettled(sources.map((source) => source.load(config))),
    Promise.allSettled(configured.map((environment) => getAppMetrics(azure, environment.resourceId))),
  ]);

  return {
    sources: sources.map(({ id, label }, index): SourceResult => {
      const outcome = sourceOutcomes[index];
      if (outcome?.status === "fulfilled") {
        return { id, label, status: "ok", item: outcome.value };
      }
      console.error(`[portal] ${label} failed:`, outcome?.reason);
      return { id, label, status: "error", message: `${label} is unavailable right now.` };
    }),
    environments: configured.map(({ id, label }, index): EnvironmentResult => {
      const outcome = environmentOutcomes[index];
      if (outcome?.status === "fulfilled") {
        return { id, label, status: "ok", metrics: outcome.value };
      }
      console.error(`[portal] ${label} traffic failed:`, outcome?.reason);
      return { id, label, status: "error", message: `${label} traffic is unavailable right now.` };
    }),
  };
}
