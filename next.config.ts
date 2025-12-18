import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    qualities: [70, 70, 70, 70, 70, 70, 70, 70, 70, 75, 80],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // Turbopack config (empty to silence warning about webpack config)
  turbopack: {},
  // Increase chunk size warning limit (default 500KB, increase to 1000KB)
  webpack: (config) => {
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization?.splitChunks,
        maxSize: 1000000, // 1MB chunks
      },
    };
    return config;
  },
};

export default nextConfig;
