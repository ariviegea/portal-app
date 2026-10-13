import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EnvironmentResult, SourceResult } from "@/models/azureResources/types";
import { PortalLoading, PortalView } from "./PortalView";

const npm: SourceResult = {
  id: "npm",
  label: "npm package",
  status: "ok",
  item: { title: "next 16.4.0", detail: "The React Framework", href: "https://www.npmjs.com/package/next" },
};

const github: SourceResult = {
  id: "github",
  label: "GitHub repository",
  status: "error",
  message: "GitHub repository is unavailable right now.",
};

const production: EnvironmentResult = {
  id: "production",
  label: "Production",
  status: "ok",
  metrics: { appName: "portal-prod", requests: 120, serverErrors: 2, averageResponseMs: 250 },
};

/** The view's HTML, as the server sends it to the browser. */
function render(sources: SourceResult[], environments: EnvironmentResult[] = []): string {
  return renderToStaticMarkup(<PortalView sources={sources} environments={environments} />);
}

/** The visible text of the element with this data-testid, or undefined when it is not on the page. */
function textOf(html: string, testId: string): string | undefined {
  const element = new RegExp(`<article[^>]*data-testid="${testId}"[^>]*>(.*?)</article>`, "s").exec(html);
  return element?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

describe("PortalView", () => {
  describe("heading", () => {
    it('shows "Repositories" with the id api-traffic-heading, once', () => {
      const html = render([npm]);

      expect(html).toMatch(/<h[1-6][^>]*\bid="api-traffic-heading"[^>]*>Repositories<\/h[1-6]>/);
      expect(html.match(/id="api-traffic-heading"/g)).toHaveLength(1);
    });

    it("comes before the API cards", () => {
      const html = render([npm]);

      expect(html.indexOf('id="api-traffic-heading"')).toBeLessThan(html.indexOf('data-testid="source-npm"'));
    });

    it("is shown even when there are no sources", () => {
      expect(render([])).toContain(">Repositories<");
    });
  });

  describe("API cards", () => {
    it("shows a source's label, title and detail, with the title linking to its page", () => {
      const html = render([npm]);

      expect(textOf(html, "source-npm")).toBe("npm package next 16.4.0 The React Framework");
      expect(html).toContain('<a href="https://www.npmjs.com/package/next">next 16.4.0</a>');
    });

    it('shows a failed source as "Unavailable" with its message and no link', () => {
      const html = render([github]);

      expect(textOf(html, "source-github")).toBe(
        "GitHub repository Unavailable GitHub repository is unavailable right now.",
      );
      expect(html).not.toContain("<a ");
    });

    it("shows one card per source, in the order given", () => {
      const html = render([npm, github]);

      expect(html.match(/data-testid="source-/g)).toHaveLength(2);
      expect(html.indexOf('data-testid="source-npm"')).toBeLessThan(html.indexOf('data-testid="source-github"'));
    });
  });

  describe("Azure traffic section", () => {
    it("is left out when no environment is set up", () => {
      expect(render([npm])).not.toContain('data-testid="azure-traffic"');
    });

    it("is shown below the API cards when an environment is set up", () => {
      const html = render([npm], [production]);

      expect(html).toContain('data-testid="azure-traffic"');
      expect(html.indexOf('data-testid="source-npm"')).toBeLessThan(html.indexOf('data-testid="azure-traffic"'));
      expect(textOf(html, "azure-requests")).toBe("Requests 120 in the last hour");
    });
  });
});

describe("PortalLoading", () => {
  it("announces that data is loading", () => {
    const html = renderToStaticMarkup(<PortalLoading />);

    expect(html).toMatch(/<p[^>]*role="status"[^>]*>Loading the latest data…<\/p>/);
  });
});
