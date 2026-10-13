import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The deploy job sets NEXT_OUTPUT to get a self-contained bundle; local commands and tests are unaffected.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  compiler: {
    styledComponents: true,
  },
  // The site has no home page of its own: "/" sends visitors to the portal.
  // Declared here, the redirect is applied before any page is rendered.
  async redirects() {
    return [{ source: "/", destination: "/portal", permanent: false }];
  },
};

export default nextConfig;
