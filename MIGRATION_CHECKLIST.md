# Migration Checklist - strainspotter → strainspotter-web

## Pre-Migration Verification

### ✅ Source Project (strainspotter-web)

- [x] **Framework:** Next.js 16.0.7 (App Router)
- [x] **Entry Point:** `app/page.tsx` exists and renders content
- [x] **Layout:** `app/layout.tsx` exists with `globals.css` import
- [x] **Build Script:** `npm run build` works
- [x] **No Localhost:** No hardcoded localhost URLs
- [x] **API Routes:** All use relative paths (`/api/...`)
- [x] **Environment Variables:** Properly used (no hardcoded values)
- [x] **Vercel Ready:** Standard Next.js structure

### ⏳ Target Repo (strainspotter) - To Verify

- [ ] **Git Remote:** Confirm GitHub repo URL
- [ ] **Vercel Connection:** Confirm project is connected
- [ ] **Current Branch:** Likely `main`
- [ ] **Current State:** Check if old/empty/misconfigured
- [ ] **Environment Variables:** List what's set in Vercel

## Migration Steps (When Approved)

### Step 1: Backup Current State
```bash
cd /tmp
git clone <strainspotter-repo-url> strainspotter-temp
cd strainspotter-temp
git checkout -b backup-before-migration
git push origin backup-before-migration
git checkout main
```

### Step 2: Replace Files
```bash
# Remove old files (keep .git)
find . -mindepth 1 -maxdepth 1 ! -name '.git' ! -name '.gitignore' -exec rm -rf {} +

# Copy new files
cp -r /Users/christophercook/Desktop/strainspotter-web/* .
cp -r /Users/christophercook/Desktop/strainspotter-web/.gitignore . 2>/dev/null || true
```

### Step 3: Verify Structure
```bash
# Check key files exist
test -f app/page.tsx && echo "✅ Homepage"
test -f app/layout.tsx && echo "✅ Layout"
test -f package.json && echo "✅ Package.json"
test -f next.config.ts && echo "✅ Next.js config"
```

### Step 4: Test Build
```bash
npm install
npm run build
# Should succeed without errors
```

### Step 5: Commit and Push
```bash
git add .
git commit -m "Replace with strainspotter-web codebase"
git push origin main
```

### Step 6: Monitor Deployment
- Check Vercel dashboard
- Watch build logs
- Verify deployment succeeds

## Post-Migration Verification

- [ ] **Domain:** `https://app.strainspotter.app` loads correctly
- [ ] **Homepage:** Content renders (no black screen)
- [ ] **Desktop App:** No longer shows black screen
- [ ] **Auth:** Sign in works
- [ ] **Scanner:** Scanner page loads
- [ ] **Garden:** Garden page loads
- [ ] **API Routes:** All endpoints work

## Rollback Plan

If deployment fails:
```bash
cd /tmp/strainspotter-temp
git checkout backup-before-migration
git checkout -b main
git push --force origin main
```

---

**Status:** Ready for execution after approval and verification of target repo state.
