# Privacy Manifest — Plain-English Notes

You said "i dunno" on the privacy manifest. That's fine — most web devs
have never had to deal with one. Here's what it is and what we actually
need to do.

## What is a privacy manifest

Apple introduced **PrivacyInfo.xcprivacy** in 2024. It's an XML file
inside an iOS / iPadOS / macOS app bundle that explicitly declares:

1. What "tracking domains" the app contacts
2. What data types it collects, and for what reason
3. Which Apple "required reason" APIs it calls (file timestamps, disk
   space, system boot time, user defaults, active keyboards)

If you're submitting a **native** binary to the App Store and you don't
include one, your build is rejected. Period.

## Does StrainSpotter need one right now

**Not as a pure web app.** As long as we're deployed to the web (Vercel
+ PWA install), Apple has no jurisdiction. Users can add the PWA to
their home screen and it behaves like an app — but no Apple submission,
no privacy manifest needed.

**Yes, the moment we wrap it native.** When we package this as an iOS
binary — most likely via Capacitor, since it's a Next.js app and that's
the cleanest path — we'll need a PrivacyInfo.xcprivacy in the iOS
project. Capacitor 6+ generates a starter one for you and the iOS
plugin packages declare their own.

## What we'd declare for StrainSpotter

When we get there, the manifest declarations will be roughly:

### Data types collected
- **Photos** — camera/library access for scanning. Used for app
  functionality. NOT linked to user identity. NOT used for tracking.
- **Email address** (optional, for accounts) — used for app functionality.
  Linked to user identity. NOT used for tracking.
- **Crash data + performance metrics** (Vercel Analytics) — used for app
  functionality. NOT linked to identity. NOT used for tracking.

### Tracking domains
None. We do not run advertising or third-party analytics that fingerprint
across apps.

### Required Reason APIs
For a Capacitor wrap, the typical declarations needed are:
- `NSPrivacyAccessedAPICategoryFileTimestamp` — reason `C617.1` (display
  to user) — Capacitor and many image libraries hit this
- `NSPrivacyAccessedAPICategoryUserDefaults` — reason `CA92.1` (access
  info from same app) — for storing the age-gate flag, settings, etc.
- `NSPrivacyAccessedAPICategorySystemBootTime` — reason `35F9.1` if any
  analytics package uses uptime
- `NSPrivacyAccessedAPICategoryDiskSpace` — reason `E174.1` if Capacitor's
  filesystem plugin is used

The exact list is determined by which Capacitor plugins we include.

## What I've done now

I haven't created a `PrivacyInfo.xcprivacy` yet because there's no native
project to put one in. When you decide to wrap this as a Capacitor iOS
app, this doc becomes the checklist for that step.

What I HAVE done now:
- Set 18+ age gate (was 21+, lowered per your spec)
- Added settings → "Clear age verification" so adults can re-verify on
  shared devices
- App Store listing copy in `docs/APP_STORE_LISTING.md` already includes
  "no third-party tracking" and "no medical claims" disclosures that
  Apple's reviewer reads alongside the manifest

## When we get to the wrap

Two paths from this Next.js codebase to the App Store:

1. **Capacitor (recommended).** Run `npx cap init`, add iOS, generate
   the privacy manifest, build, submit. Keeps the whole codebase in
   one repo. ~2-3 days of plumbing.
2. **Pure web + Add to Home Screen** (no Apple at all). Zero submission
   risk, but no App Store presence and no in-app purchases.

I can set up the Capacitor wrap whenever you say go.
