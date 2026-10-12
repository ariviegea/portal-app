import { getAppMetrics } from "@/models/azureResources/azureMetricsModel";
import type {
  AzureConfig,
  EnvironmentId,
  EnvironmentResult,
  PortalConfig,
  PortalItem,
  SourceId,
  SourceResult,
} from "@/models/azureResources/types";

/** One API shown as a card: which it is, what to call it, and how to load it. */
export type Source = {
  id: SourceId;
  label: string;
  load(config: PortalConfig): Promise<PortalItem>;
};

/** One Azure web app whose traffic can be shown, and where its resource ID is configured. */
export type Environment = {
  id: EnvironmentId;
  label: string;
  resourceId(azure: AzureConfig): string | undefined;
};

/** Loads one API source. A failure is logged and becomes an "error" result. */
export async function loadSource({ id, label, load }: Source, config: PortalConfig): Promise<SourceResult> {
  try {
    return { id, label, status: "ok", item: await load(config) };
  } catch (error) {
    console.error(`[portal] ${label} failed:`, error);
    return { id, label, status: "error", message: `${label} is unavailable right now.` };
  }
}

/** Loads one Azure environment's traffic. A failure is logged and becomes an "error" result. */
export async function loadEnvironment(
  { id, label }: Environment,
  azure: AzureConfig,
  resourceId: string,
): Promise<EnvironmentResult> {
  try {
    return { id, label, status: "ok", metrics: await getAppMetrics(azure, resourceId) };
  } catch (error) {
    console.error(`[portal] ${label} traffic failed:`, error);
    return { id, label, status: "error", message: `${label} traffic is unavailable right now.` };
  }
}
