import { fetchPortalItem } from "../data/fetchData";
import { isRecord } from "../data/utils";
import type { PortalItem } from "../azureResources/types";

/** Latest version of an artifact on Maven Central. */
export function getMavenArtifact(baseUrl: string, group: string, artifact: string): Promise<PortalItem> {
  const query = new URLSearchParams({
    q: `g:"${group}" AND a:"${artifact}"`,
    rows: "1",
    wt: "json",
  });

  return fetchPortalItem(`${baseUrl}/solrsearch/select?${query}`, "Maven Central", (data) => {
    // The search answers with a list of matches; the first one is the artifact.
    const docs = isRecord(data.response) ? data.response.docs : undefined;
    if (!Array.isArray(docs)) return undefined;

    const doc: unknown = docs[0];
    if (doc === undefined) {
      throw new Error(`Maven Central has no artifact ${group}:${artifact}`);
    }
    if (
      !isRecord(doc) ||
      typeof doc.g !== "string" ||
      typeof doc.a !== "string" ||
      typeof doc.latestVersion !== "string"
    ) {
      return undefined;
    }

    return {
      title: `${doc.g}:${doc.a} ${doc.latestVersion}`,
      detail: "Latest version on Maven Central",
      href: `https://central.sonatype.com/artifact/${doc.g}/${doc.a}`,
    };
  });
}
