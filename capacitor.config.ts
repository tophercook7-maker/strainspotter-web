import type { CapacitorConfig } from "@capacitor/cli";

/**
 * StrainSpotter — Capacitor shell (iOS + Android).
 *
 * **Current strategy (live web):** `server.url` points at production so the WebView loads
 * the same Next.js app as Vercel (`strainspotter.com`). Pair with `NEXT_PUBLIC_API_BASE_URL`
 * if the embedded origin ever differs from the API host.
 *
 * **Bundled-static later:** remove `server`, run a static Next export into `webDir` (`out/`),
 * keep `appId` / plugins, and ship offline-capable assets.
 */
const config: CapacitorConfig = {
  appId: "com.mixedmakershop.strainspotter",
  appName: "StrainSpotter",
  webDir: "out",
  server: {
    url: "https://strainspotter.com",
    cleartext: false,
  },
};

export default config;
