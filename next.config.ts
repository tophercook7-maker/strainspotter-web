import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // DISABLED: Prevents double-mounting in dev
  // Force cache invalidation - bump this on each deploy to clear poisoned JS
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
};

export default nextConfig;
