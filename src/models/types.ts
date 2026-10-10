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

/** Base addresses of the external APIs, without a trailing slash. */
export type PortalConfig = {
  npmApiUrl: string;
  mavenApiUrl: string;
  githubApiUrl: string;
};
