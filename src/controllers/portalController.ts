import { loadConfig } from "@/models/data/config";
import { getGithubRepo } from "@/models/github/githubRepoModel";
import { getMavenArtifact } from "@/models/maven/mavenArtifactModel";
import { getNpmPackage } from "@/models/npmPackage/npmPackageModel";
import type { PortalConfig, PortalData } from "@/models/azureResources/types";
import { loadEnvironment, loadSource, type Environment, type Source } from "./utils/loaders";

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

  const environmentLoads = environments.flatMap((environment) => {
    const resourceId = environment.resourceId(azure);
    return hasIdentity && resourceId ? [loadEnvironment(environment, azure, resourceId)] : [];
  });

  const [sourceResults, environmentResults] = await Promise.all([
    Promise.all(sources.map((source) => loadSource(source, config))),
    Promise.all(environmentLoads),
  ]);

  return { sources: sourceResults, environments: environmentResults };
}
