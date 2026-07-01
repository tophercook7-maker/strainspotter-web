import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {},

  // When multiple lockfiles exist, Next may infer a parent folder as workspace root.
  // Pin tracing to this app so server code resolving `data/` sees the real repo.
  outputFileTracingRoot: path.join(__dirname),

  // NOTE: the api/data-engine/* routes are local-only (they 404 in production)
  // but Turbopack's serverless-function output is large (~331MB uncompressed),
  // over Vercel's default 250MB limit. `outputFileTracingExcludes` does NOT help
  // here — Turbopack (`next build --turbo`) ignores it. The deploy is unblocked
  // via VERCEL_SUPPORT_LARGE_FUNCTIONS=1 (set on the Vercel project); the
  // oversized function is never invoked in prod, so this is harmless. Proper
  // long-term fix: stop shipping these local-only routes / slim the bundle.
  // See docs/DEPLOY_NOTES.md.

  // Skip TypeScript errors during build — legacy type mismatches
  // in scanner/monetization files pre-date the auth system.
  // Clean these up incrementally; don't block deploys.
  typescript: {
    // Type errors now fail the build. The repo currently typechecks clean under
    // the existing tsconfig (`tsc --noEmit` → 0 errors); CI also runs typecheck.
    // Next step: tighten tsconfig toward `strict: true` incrementally.
    ignoreBuildErrors: false,
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
