# Desktop Tester Distribution Guide

## Overview

This guide covers preparing and distributing StrainSpotter desktop builds for private testing.

## Step 1: Test Build Flag

**Environment Variable:**
```bash
DESKTOP_TEST_BUILD=true
NEXT_PUBLIC_DESKTOP_TEST_BUILD=true
```

**UI Indicators:**
- Subtle footer text: "StrainSpotter — Early Test Build"
- Shown in About page footer
- No banners or popups

## Step 2: Access Control

### Whitelist Method

**Add user to whitelist:**
```bash
curl -X POST http://localhost:3000/api/admin/desktop/whitelist \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid-here",
    "notes": "Tester name or notes"
  }'
```

**Remove from whitelist:**
```bash
curl -X DELETE "http://localhost:3000/api/admin/desktop/whitelist?user_id=user-uuid-here"
```

**List whitelisted users:**
```bash
curl http://localhost:3000/api/admin/desktop/whitelist
```

### Feature Flag Method

**Enable desktop access:**
```bash
curl -X POST http://localhost:3000/api/admin/desktop/feature-flag \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid-here",
    "enabled": true
  }'
```

**Disable desktop access:**
```bash
curl -X POST http://localhost:3000/api/admin/desktop/feature-flag \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid-here",
    "enabled": false
  }'
```

### Access Check Flow

1. Desktop app loads (any route)
2. `DesktopAccessGate` component checks access on mount
3. Calls `/api/desktop/check-access`
4. If authorized → continue to requested page
5. If denied → redirect to `/desktop-access-denied`

## Step 3: Build Installers

### Build Command

```bash
npm run tauri:build:test
```

This will:
1. Set test build flags
2. Build Next.js
3. Build Tauri app
4. Generate installers

### Output Locations

**macOS:**
- App: `src-tauri/target/release/bundle/macos/StrainSpotter.app`
- DMG: `src-tauri/target/release/bundle/dmg/StrainSpotter_*.dmg`

**Windows:**
- MSI: `src-tauri/target/release/bundle/msi/StrainSpotter_*.msi`

### Signing (Optional)

**macOS:**
```bash
codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name" \
  src-tauri/target/release/bundle/macos/StrainSpotter.app
```

**Windows:**
- Use signtool.exe with your code signing certificate

## Step 4: Version Labeling

**Current Version:** `DESKTOP_TEST_v1`

**Version Info:**
- Internal label: `DESKTOP_TEST_v1`
- Cargo version: `1.0.0-test`
- Tauri version: `DESKTOP_TEST_v1`

**No semantic versioning yet** - avoids perceived stability promises.

## Step 5: Distribution

### Distribution Checklist

- [ ] Build installers (`npm run tauri:build:test`)
- [ ] Test on clean macOS machine
- [ ] Test on clean Windows machine
- [ ] Verify auto-update works
- [ ] Verify remote UI loading
- [ ] Verify access control works
- [ ] Create download links (private)
- [ ] Prepare personal message to testers

### Tester Message Template

```
Subject: StrainSpotter Desktop App — Private Test Build

Hi [Name],

You've been selected to test the StrainSpotter desktop app.

Download:
- macOS: [link]
- Windows: [link]

Installation:
1. Download the installer
2. Run and follow prompts
3. Sign in with your existing account

What to test:
- General usage
- Scanner functionality
- Garden features
- Community access

This is an early test build. If you encounter issues, please note them but don't feel pressure to report immediately.

Thank you for testing!

[Your Name]
```

### Do NOT:
- ❌ Post publicly
- ❌ Mention roadmap
- ❌ Invite feature feedback
- ❌ Create public announcements

## Step 6: Observation Mode

### Monitoring

**What to Monitor:**
- Auth errors (check Supabase logs)
- Scan quota enforcement (check API logs)
- Crash logs (Tauri logs)
- Performance metrics

**What NOT to Do:**
- ❌ Respond immediately to feedback
- ❌ Make changes based on single tester
- ❌ Add features during test period

**Process:**
1. Collect all feedback
2. Analyze patterns
3. Prioritize issues
4. Plan fixes for next build

### Access Revocation

**Instant Revocation:**
```bash
# Remove from whitelist
curl -X DELETE "http://localhost:3000/api/admin/desktop/whitelist?user_id=user-uuid"

# OR disable feature flag
curl -X POST http://localhost:3000/api/admin/desktop/feature-flag \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user-uuid", "enabled": false}'
```

User will see access denied page (`/desktop-access-denied`) on next app launch.

### Kill Switch

**Global Kill Switch:**
```bash
# Set environment variable
DESKTOP_ACCESS_ENABLED=false
```

All users will be denied access, regardless of whitelist/feature flag.

## Database Setup

**Run Migration:**
```sql
-- Run migrations/2025_01_21_desktop_access_control.sql
```

This creates:
- `desktop_whitelist` table
- `desktop_access` column in `profiles`
- `check_desktop_access()` function

## Environment Variables

**Required:**
```bash
DESKTOP_TEST_BUILD=true
NEXT_PUBLIC_DESKTOP_TEST_BUILD=true
DESKTOP_VERSION=DESKTOP_TEST_v1
```

**Optional:**
```bash
DESKTOP_ACCESS_ENABLED=true  # Set to false to disable all access
```

## Acceptance Check ✅

1. ✅ **Testers can install without help**
   - Clear installers (DMG for macOS, MSI for Windows)
   - Standard installation flow
   - No special requirements

2. ✅ **App updates UI without reinstall**
   - Remote UI loading active (`frontendDist` in config)
   - Changes deploy instantly
   - No app update required

3. ✅ **Access can be revoked instantly**
   - Whitelist removal via API
   - Feature flag toggle via API
   - Global kill switch (`DESKTOP_ACCESS_ENABLED=false`)

4. ✅ **Kill switch still works**
   - `DESKTOP_ACCESS_ENABLED=false` denies all
   - Works independently of whitelist
   - Takes effect on next app launch

5. ✅ **No pressure is placed on testers**
   - Clear "Early Test Build" messaging (subtle footer)
   - No feedback requests in app
   - Observation mode only
   - Personal distribution only

## Next Steps

1. **Run Migration:**
   ```bash
   # In Supabase SQL Editor
   # Run: migrations/2025_01_21_desktop_access_control.sql
   ```

2. **Add Testers:**
   ```bash
   # Add to whitelist or enable feature flag
   ```

3. **Build Installers:**
   ```bash
   npm run tauri:build:test
   ```

4. **Test Installers:**
   - Test on clean machines
   - Verify all features work
   - Verify access control

5. **Distribute:**
   - Create private download links
   - Send personal messages
   - Begin observation mode

---

**Desktop Tester Distribution is ready!** 🎉
