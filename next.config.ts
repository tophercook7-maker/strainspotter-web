import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {},

  // When multiple lockfiles exist, Next may infer a parent folder as workspace root.
  // Pin tracing to this app so server code resolving `data/` sees the real repo.
  outputFileTracingRoot: path.join(__dirname),

  // The data-engine API routes are local-only (they 404 in production) but do
  // broad readdir/readFile over the committed `data/` tree (~170MB of reference
  // images, embeddings, catalog). Next's file tracing would otherwise bundle
  // that data into their serverless functions, blowing past Vercel's 250MB
  // uncompressed limit (api/data-engine/image hit 334MB). Production reads
  // references from Supabase, not these files, so exclude them from tracing.
  outputFileTracingExcludes: {
    "/api/data-engine/**": ["./data/**"],
  },

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
