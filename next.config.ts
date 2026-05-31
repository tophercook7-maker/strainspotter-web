import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {},
  outputFileTracingIncludes: {
    "/api/scan": ["./data/embeddings/strain-embeddings.json"],
    "/api/strains": ["./data/normalized-strain-catalog.json", "./lib/data/strains.json"],
  },

  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: "tsconfig.next.json",
  },

  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname),
    };
    return config;
  },
};

export default nextConfig;
