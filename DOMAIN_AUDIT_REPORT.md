# Domain Audit Report

## Hardcoded Domains Found

### 1. Tauri Desktop App Configuration
**File:** `src-tauri/tauri.conf.json`
- **Current:** `"frontendDist": "https://strainspotter.app"`
- **Status:** ⚠️ Hardcoded
- **Action:** Make configurable via `DESKTOP_REMOTE_URL` env var
- **Target:** `https://app.strainspotter.app` (after DNS verification)

### 2. Billing Portal API
**File:** `app/api/billing/portal/route.ts`
- **Current:** `url: 'https://billing.strainspotter.com'`
- **Status:** ⚠️ Hardcoded
- **Action:** Make configurable via `NEXT_PUBLIC_BILLING_PORTAL_URL` env var

### 3. Build Script Defaults
**File:** `scripts/build-desktop-installers.sh`
- **Current:** `DESKTOP_REMOTE_URL=${DESKTOP_REMOTE_URL:-"https://strainspotter.app"}`
- **Status:** ✅ Already configurable, but default needs update
- **Action:** Update default to `https://app.strainspotter.app`

### 4. Remote Setup Script
**File:** `scripts/setup-tauri-remote.sh`
- **Current:** `REMOTE_URL="https://strainspotter.app"`
- **Status:** ⚠️ Hardcoded default
- **Action:** Update default to `https://app.strainspotter.app`

## Documentation Files (Not Code)
These are documentation only and don't affect functionality:
- `BUILD_INSTALLERS_SUMMARY.md`
- `TAURI_DESKTOP_SUMMARY.md`
- `FIX_BLACK_SCREEN.md`
- `DEPLOY_LATEST_CODE.md`
- `QUICK_FIX_LOCALHOST.md`
- `WEB_SITUATION_REPORT.md`

## Environment Variables to Add

1. **`DESKTOP_REMOTE_URL`** - Desktop app remote URL
   - Default: `https://app.strainspotter.app`
   - Used in: Tauri config, build scripts

2. **`NEXT_PUBLIC_BILLING_PORTAL_URL`** - Billing portal URL
   - Default: `https://billing.strainspotter.com`
   - Used in: `app/api/billing/portal/route.ts`

## Changes Required

1. ✅ Update Tauri config to use env var (via build script)
2. ✅ Update build script default to `app.strainspotter.app`
3. ✅ Update setup script default to `app.strainspotter.app`
4. ✅ Make billing portal URL configurable
5. ✅ Add error logging for URL load failures in desktop app
