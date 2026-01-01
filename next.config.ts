/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,     // ❌ STOP DOUBLE MOUNT / RELOAD
  experimental: {
    turbo: false              // ❌ DISABLE TURBOPACK (CAUSES FLASH)
  }
}

export default nextConfig
