import type { PortalItem } from "../azureResources/types";
import { fetchPortalItem } from "../data/fetchData";

/** Public details of a GitHub repository, given as "owner/name". */
export function getGithubRepo(baseUrl: string, fullName: string): Promise<PortalItem> {
  return fetchPortalItem(`${baseUrl}/repos/${fullName}`, "GitHub", (data) => {
    if (
      typeof data.full_name !== "string" ||
      typeof data.stargazers_count !== "number" ||
      typeof data.open_issues_count !== "number" ||
      typeof data.html_url !== "string" ||
      !data.html_url.startsWith("https://")
    ) {
      return undefined;
    }

    return {
      title: data.full_name,
      detail: `${data.stargazers_count} stars · ${data.open_issues_count} open issues`,
      href: data.html_url,
    };
  });
}
