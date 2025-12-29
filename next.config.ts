import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Force cache invalidation - bump this on each deploy to clear poisoned JS
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
};

export default nextConfig;
