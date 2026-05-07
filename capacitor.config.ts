// capacitor.config.ts — StrainSpotter native shell
//
// Strategy: this codebase is a Next.js 14 app with Edge runtime API
// routes that cannot be statically exported. Instead of trying to bundle
// the JS into the iOS binary, the Capacitor shell loads the live
// production deploy as its server URL. The binary is a thin native
// wrapper providing: app icon on home screen, splash, age-gate
// integration, status-bar styling, and (later) native push notifications.
//
// Pre-flight before `npx cap sync` / `npx cap open ios`:
//   1. The production deploy at https://strainspotter.app must be live.
//   2. Create the iOS project once: `npx cap add ios`
//   3. Open Xcode: `npx cap open ios`. Set Bundle Identifier,
//      development team, and signing certificate there.
//   4. Drop public/StrainSpotterEmblem.png into ios/App/App/Assets.xcassets
//      AppIcon.appiconset (Xcode auto-generates per-size assets).
//   5. Wire PrivacyInfo.xcprivacy per docs/PRIVACY_MANIFEST_NOTES.md.

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mixedmakershop.strainspotter",
  appName: "StrainSpotter",

  // Capacitor needs a webDir for offline fallback assets even when we use
  // a remote server URL. We point it at /public so the StrainSpotter
  // emblem + manifest are available offline.
  webDir: "public",

  server: {
    // Load the live Vercel deploy. Apple is fine with this as long as the
    // wrapper is reasonable thickness (icon, splash, status bar, etc.).
    url: "https://strainspotter.app",
    cleartext: false,
    // Allow HTTPS embedded resources from these origins (Stripe, Supabase,
    // OpenAI image responses pass through the API not directly).
    allowNavigation: [
      "strainspotter.app",
      "*.strainspotter.app",
      "*.supabase.co",
      "checkout.stripe.com",
      "billing.stripe.com",
    ],
  },

  ios: {
    // Match the dark theme color so the safe-area gutters match the app.
    backgroundColor: "#0a0f0a",
    contentInset: "always",
    // Disable scroll bounce to feel more app-native.
    scrollEnabled: true,
  },

  android: {
    backgroundColor: "#0a0f0a",
    // We're not shipping Android first, but the field is here so when
    // we do, the config doesn't need a full re-think.
  },
};

export default config;
