import { fetchJson } from "./fetchJson";
import { isRecord } from "./isRecord";
import type { PortalItem } from "./types";

/** Public details of a GitHub repository, given as "owner/name". */
export async function getGithubRepo(baseUrl: string, fullName: string): Promise<PortalItem> {
  const data = await fetchJson(`${baseUrl}/repos/${fullName}`);

  if (
    !isRecord(data) ||
    typeof data.full_name !== "string" ||
    typeof data.stargazers_count !== "number" ||
    typeof data.open_issues_count !== "number" ||
    typeof data.html_url !== "string" ||
    !data.html_url.startsWith("https://")
  ) {
    throw new Error("Unexpected response from GitHub");
  }

  return {
    title: data.full_name,
    detail: `${data.stargazers_count} stars · ${data.open_issues_count} open issues`,
    href: data.html_url,
  };
}
