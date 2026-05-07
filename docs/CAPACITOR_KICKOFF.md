# Capacitor Wrap — Kickoff Guide

Last updated: May 7, 2026
Estimated time to App-Store-ready binary: 2-3 working days.

This is the runbook for taking StrainSpotter from a working web app to
an iOS binary you can submit to App Store Connect. Everything in
`capacitor.config.ts` is already wired for the strategy below.

---

## Strategy at a glance

The iOS binary is a **thin native shell** around the live Vercel deploy.
The WebView at app launch loads `https://strainspotter.app` directly.
The binary ships:

- Native app icon + splash screen
- Age-gate integration with iOS launch flow
- Native status bar / safe area styling
- Stripe Checkout / Customer Portal redirects (handled inside WebView)
- Privacy manifest (PrivacyInfo.xcprivacy) declaring API usage
- Eventual: native push notifications, deeper sharing intents

This is approved by Apple as long as the binary is "reasonable
thickness" — see App Store Review Guideline 4.7. The native icon,
splash, age-gate, and (later) push integration meet that bar.

---

## Prerequisites

| Requirement | Why |
|---|---|
| **macOS** | Xcode is macOS-only. |
| **Xcode 15+** | iOS 17+ SDK. |
| **Node 20+, npm 10+** | Already required by the web app. |
| **Apple Developer account** ($99/yr) | App Store submission. |
| **Production deploy live at strainspotter.app** | The WebView loads it. |
| **Privacy + Terms pages live** | Apple reviewer checks both. |

---

## Step 1 — Install Capacitor packages

From repo root:

```bash
npm install --save-dev @capacitor/cli
npm install --save \
  @capacitor/core \
  @capacitor/ios \
  @capacitor/app \
  @capacitor/status-bar \
  @capacitor/splash-screen
```

`@capacitor/app` exposes lifecycle events; `@capacitor/status-bar`
matches the status-bar tint to our dark theme; `@capacitor/splash-screen`
controls the launch image.

---

## Step 2 — Initialize and add iOS

```bash
# Confirm capacitor.config.ts is correct (already committed in repo).
npx cap init StrainSpotter com.mixedmakershop.strainspotter \
  --web-dir public \
  --skip-appid-validation

# Generate the iOS project. Creates ios/ at repo root.
npx cap add ios

# IMPORTANT: Capacitor 8 requires iOS 15+ minimum but the generated
# Podfile + Xcode project default to iOS 14. Without this step, the
# workspace opens empty in Xcode because pod install failed.
./scripts/capacitor/post-add-ios.sh
```

This creates `ios/App/App.xcworkspace` and runs `pod install` cleanly.
Open it with:

```bash
open ios/App/App.xcworkspace
```

> Don't use `npx cap open ios` — it sometimes opens the .xcodeproj
> instead of the .xcworkspace. The workspace is what wires Pods in.

---

## Step 3 — Xcode configuration

In Xcode:

1. Select the **App** target → **Signing & Capabilities**.
2. Set **Team** to your Apple Developer team. Xcode will auto-create the
   provisioning profile.
3. **Bundle Identifier:** `com.mixedmakershop.strainspotter` (must match
   capacitor.config.ts).
4. **Display Name:** `StrainSpotter`.
5. **Deployment Info → iOS:** 16.0 minimum.
6. **Info.plist** — add usage strings for any permissions the app
   requests:
   - `NSCameraUsageDescription` →
     "StrainSpotter uses your camera to scan and analyze cannabis flower,
      packaging, and plant health from photos."
   - `NSPhotoLibraryUsageDescription` →
     "StrainSpotter uses your photo library so you can scan existing
      photos of cannabis flower or plants."
   - `NSLocationWhenInUseUsageDescription` (only if Dispensary finder
     ships in v1) → "StrainSpotter uses your location to find nearby
      cannabis dispensaries."

---

## Step 4 — App icon

The 1024×1024 master icon is at `public/StrainSpotterEmblem.png`. In
Xcode:

1. Open `App/App/Assets.xcassets/AppIcon.appiconset`.
2. Drag the master into the 1024×1024 slot.
3. Use a tool like Bakery or Asset Catalog Generator to populate all
   other sizes. **Do not** use opacity / transparency on iOS app icons —
   Apple rejects.
4. Confirm in **App Icon and Launch Images** that the AppIcon ship.

For the launch screen, the simplest path is to drop the same emblem
into `LaunchScreen.storyboard` centered on a dark background
(`#0a0f0a`).

---

## Step 5 — Privacy manifest (PrivacyInfo.xcprivacy)

Apple requires this for new submissions since 2024.

```bash
# Create the file at ios/App/App/PrivacyInfo.xcprivacy
```

Minimum content (covers a Capacitor wrap that uses standard plugins):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyTracking</key>
  <false/>
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeEmailAddress</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypePhotosOrVideos</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <false/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
  </array>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array><string>C617.1</string></array>
    </dict>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array><string>CA92.1</string></array>
    </dict>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryDiskSpace</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array><string>E174.1</string></array>
    </dict>
  </array>
</dict>
</plist>
```

Add the file to the App target in Xcode (File Inspector → Target
Membership → check App).

---

## Step 6 — First TestFlight build

In Xcode:

1. Select **Any iOS Device (arm64)** as the run target.
2. Product → Archive. (Takes ~3-5 minutes the first time.)
3. When the Organizer opens, choose **Distribute App → TestFlight &
   App Store**.
4. Upload. Wait 5-15 minutes for processing.
5. Open App Store Connect → TestFlight tab. Add yourself as an
   internal tester. Install the TestFlight build on your phone.

---

## Step 7 — Smoke test on real hardware

Run through the flow on the actual device:

- [ ] First launch: AgeGate appears, accepts a DOB, redirects to scanner.
- [ ] Tap Scan with a photo selected. Paywall pops (you're not subscribed).
- [ ] Sign in as a member-tier test account. Scan completes successfully.
- [ ] Try Grow Doctor → Diagnose. Photo upload works, result renders.
- [ ] Settings → Manage subscription opens Stripe portal (in-app browser).
- [ ] Privacy / Terms links from AgeGate footer load.
- [ ] Force quit, relaunch. AgeGate is bypassed (verified flag persists).
- [ ] Airplane mode: OfflineBanner appears. Tap Scan: friendly error.

---

## Step 8 — App Store submission

See `docs/APP_STORE_LISTING.md` for the listing copy, age rating
answers, and Review notes. Key blockers before hitting Submit for
Review:

- [ ] Privacy / Terms URLs publicly reachable.
- [ ] Test account credentials added to listing copy ([TODO] today).
- [ ] At least 3 screenshots per supported device size.
- [ ] App Store Review notes explain what cannabis means in this
      context (educational, not commerce).

---

## Step 9 — After approval

Vercel deploys auto-update the app's content because the binary loads
the live URL. **Native binary changes** (new permissions, new privacy
declarations, new icon, new push notif support) require a new
TestFlight build + App Store review.

Useful native tasks for v1.1+:

- **Push notifications** for grow milestones (capsule curing reminder,
  flowering week markers).
- **Apple Sign-In** as an option alongside email + password — required
  by App Store guideline 4.8 if any third-party sign-in (Google) is
  offered.
- **In-app purchases via StoreKit** instead of Stripe — Apple takes
  30% but it's the path of least friction. Decision deferred.
