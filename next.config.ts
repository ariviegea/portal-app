import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The deploy job sets NEXT_OUTPUT to get a self-contained bundle; local commands and tests are unaffected.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  compiler: {
    styledComponents: true,
  },
};

export default nextConfig;
