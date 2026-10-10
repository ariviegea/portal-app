import { fetchJson } from "./fetchJson";
import { isRecord } from "./isRecord";
import type { PortalItem } from "./types";

/** Latest version of an artifact on Maven Central. */
export async function getMavenArtifact(baseUrl: string, group: string, artifact: string): Promise<PortalItem> {
  const query = new URLSearchParams({
    q: `g:"${group}" AND a:"${artifact}"`,
    rows: "1",
    wt: "json",
  });
  const data = await fetchJson(`${baseUrl}/solrsearch/select?${query}`);

  const docs = isRecord(data) && isRecord(data.response) ? data.response.docs : undefined;
  if (!Array.isArray(docs)) {
    throw new Error("Unexpected response from Maven Central");
  }

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
    throw new Error("Unexpected response from Maven Central");
  }

  return {
    title: `${doc.g}:${doc.a} ${doc.latestVersion}`,
    detail: "Latest version on Maven Central",
    href: `https://central.sonatype.com/artifact/${doc.g}/${doc.a}`,
  };
}
