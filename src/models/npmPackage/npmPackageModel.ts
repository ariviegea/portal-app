import type { PortalItem } from "../azureResources/types";
import { fetchPortalItem } from "../data/fetchData";

/** Latest published release of an npm package. */
export function getNpmPackage(baseUrl: string, name: string): Promise<PortalItem> {
  return fetchPortalItem(`${baseUrl}/${encodeURIComponent(name)}/latest`, "npm", (data) => {
    if (typeof data.name !== "string" || typeof data.version !== "string") return undefined;

    return {
      title: `${data.name} ${data.version}`,
      detail: typeof data.description === "string" ? data.description : "No description",
      href: `https://www.npmjs.com/package/${data.name}`,
    };
  });
}
