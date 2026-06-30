import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {},

  // When multiple lockfiles exist, Next may infer a parent folder as workspace root.
  // Pin tracing to this app so server code resolving `data/` sees the real repo.
  outputFileTracingRoot: path.join(__dirname),

  // The data-engine API routes are local-only (they 404 in production) but
  // transitively pull in the heavy ML/vision stack (@xenova/transformers,
  // onnxruntime, tesseract, sharp ≈ 310MB) plus the committed data/ tree.
  // Next's file tracing bundled all of that into their serverless functions,
  // pushing api/data-engine/image to 331MB — past Vercel's 250MB uncompressed
  // limit. Since these routes 404 in prod and never run the ML path, exclude
  // those packages and the data tree from their tracing.
  outputFileTracingExcludes: {
    "/api/data-engine/**": [
      "./data/**",
      "./node_modules/@xenova/**",
      "./node_modules/onnxruntime-node/**",
      "./node_modules/onnxruntime-web/**",
      "./node_modules/tesseract.js/**",
      "./node_modules/tesseract.js-core/**",
      "./node_modules/sharp/**",
      "./node_modules/protobufjs/**",
    ],
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
