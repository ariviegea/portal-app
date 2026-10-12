/** What every API model returns: one line of content for a portal card. */
export type PortalItem = {
  title: string;
  detail: string;
  href: string;
};

export type SourceId = "npm" | "maven" | "github";

export type SourceResult =
  | { id: SourceId; label: string; status: "ok"; item: PortalItem }
  | { id: SourceId; label: string; status: "error"; message: string };

/** Last hour's traffic for one Azure web app. */
export type AppMetrics = {
  appName: string;
  requests: number;
  serverErrors: number;
  /** Null when there were no requests to measure. */
  averageResponseMs: number | null;
};

export type EnvironmentId = "production" | "staging";

export type EnvironmentResult =
  | { id: EnvironmentId; label: string; status: "ok"; metrics: AppMetrics }
  | { id: EnvironmentId; label: string; status: "error"; message: string };

/** Everything the portal page shows. */
export type PortalData = {
  sources: SourceResult[];
  /** Only the environments that are set up; empty away from Azure. */
  environments: EnvironmentResult[];
};

/**
 * Settings for reading traffic numbers from Azure Monitor. The identity values
 * are set by Azure itself on a web app that has a managed identity; they are
 * undefined everywhere else.
 */
export type AzureConfig = {
  managementUrl: string;
  identityEndpoint: string | undefined;
  identityHeader: string | undefined;
  productionResourceId: string | undefined;
  stagingResourceId: string | undefined;
};

/** Base addresses of the external APIs, without a trailing slash. */
export type PortalConfig = {
  npmApiUrl: string;
  mavenApiUrl: string;
  githubApiUrl: string;
  azure: AzureConfig;
};
