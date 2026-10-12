import { fetchJson } from "../data/fetchJson";
import { isRecord } from "../isRecord";
import type { PortalItem } from "../azureResources/types";

/** Latest published release of an npm package. */
export async function getNpmPackage(baseUrl: string, name: string): Promise<PortalItem> {
  const data = await fetchJson(`${baseUrl}/${encodeURIComponent(name)}/latest`);

  if (!isRecord(data) || typeof data.name !== "string" || typeof data.version !== "string") {
    throw new Error("Unexpected response from npm");
  }

  return {
    title: `${data.name} ${data.version}`,
    detail: typeof data.description === "string" ? data.description : "No description",
    href: `https://www.npmjs.com/package/${data.name}`,
  };
}
