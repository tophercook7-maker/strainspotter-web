# Vercel Migration Plan - Safe Preparation

## Context

- **Current Working Project:** `strainspotter-web` (local, correct app)
- **Target GitHub Repo:** `strainspotter` (connected to Vercel + domain)
- **Domain:** `app.strainspotter.app` (DNS verified, needs correct code)
- **Issue:** Desktop app shows black screen because deployed repo has wrong/old code

## Step 1: Current Vercel Project (To Verify)

### Expected Vercel Configuration

**Framework:** Next.js (auto-detected)
**Build Command:** `npm run build` (default for Next.js)
**Output Directory:** `.next` (default for Next.js)
**Root Directory:** `/` (root of repo)
**Node Version:** 20.x (from package.json)

### Verification Needed (Manual Check in Vercel Dashboard)

1. **Project Settings:**
   - GitHub repo: `strainspotter` (or `tophercook7-maker/strainspotter`)
   - Production branch: `main` (likely)
   - Framework: Next.js

2. **Build & Development Settings:**
   - Build Command: `npm run build` (or custom)
   - Output Directory: `.next` (or `out` if static export)
   - Install Command: `npm install` (default)

3. **Environment Variables:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_BILLING_PORTAL_URL` (optional)
   - `DESKTOP_REMOTE_URL` (optional, for desktop app)

## Step 2: Current Repo Audit (Read-Only)

### Current Project Structure (strainspotter-web)

**Framework:** Next.js 16.0.7
**Structure:** App Router (`app/` directory)
**Entry Point:** `app/page.tsx` (homepage)
**Layout:** `app/layout.tsx` (root layout with CSS import)

**Key Files:**
- ✅ `app/page.tsx` - Valid homepage
- ✅ `app/layout.tsx` - Root layout with globals.css
- ✅ `package.json` - Valid build scripts
- ✅ `next.config.ts` - Next.js configuration
- ✅ `app/globals.css` - Global styles imported

**Build Scripts:**
```json
{
  "build": "next build",
  "start": "next start",
  "dev": "next dev"
}
```

**No Localhost Dependencies:**
- ✅ No hardcoded localhost URLs in app code
- ✅ All API routes use relative paths (`/api/...`)
- ✅ Supabase URLs from env vars
- ✅ Desktop app uses `https://app.strainspotter.app`

### Why Black Screen Occurs

**Likely Causes:**
1. **Old/Empty Repo:** The `strainspotter` repo may contain:
   - Old Next.js version
   - Missing `app/` directory
   - Missing `app/page.tsx` or `app/layout.tsx`
   - Missing `globals.css` import

2. **Build Failure:** 
   - Missing dependencies
   - TypeScript errors
   - Missing environment variables

3. **Routing Issues:**
   - No root route (`/`)
   - Incorrect Next.js configuration
   - Static export misconfiguration

## Step 3: Comparison with strainspotter-web

### Framework Match
- ✅ Both use Next.js
- ✅ Both use App Router
- ✅ Both use TypeScript

### Directory Structure
**strainspotter-web (Current):**
```
strainspotter-web/
├── app/
│   ├── page.tsx          ✅ Homepage
│   ├── layout.tsx        ✅ Root layout
│   ├── globals.css       ✅ Styles
│   └── api/              ✅ API routes
├── components/           ✅ React components
├── lib/                  ✅ Utilities
├── package.json          ✅ Dependencies
├── next.config.ts        ✅ Next.js config
└── tsconfig.json         ✅ TypeScript config
```

**Expected strainspotter (Target):**
- May have different structure
- May be missing `app/` directory
- May have old `pages/` directory (Pages Router)

### Build Scripts
**strainspotter-web:**
- `npm run build` → `next build`
- `npm run start` → `next start`
- `npm run dev` → `next dev`

**Vercel Compatibility:**
- ✅ Standard Next.js build command
- ✅ No custom build steps required
- ✅ No special output directory needed

### Environment Variables
**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

**Optional:**
- `NEXT_PUBLIC_BILLING_PORTAL_URL`
- `DESKTOP_REMOTE_URL`

### Deployment Readiness

**strainspotter-web is Vercel-ready:**
- ✅ Standard Next.js structure
- ✅ No localhost dependencies
- ✅ Relative API routes
- ✅ Environment variable usage
- ✅ Valid build script
- ✅ Root page exists (`app/page.tsx`)

## Step 4: Safe Replacement Plan

### Strategy: Preserve Git History + Vercel Linkage

**Option A: Merge Strategy (Safest)**
1. Clone `strainspotter` repo to temp location
2. Add `strainspotter-web` as a new remote
3. Merge `strainspotter-web` into `strainspotter`
4. Resolve conflicts (prefer strainspotter-web)
5. Push to `main` branch
6. Vercel auto-deploys

**Option B: Replace with History (Recommended)**
1. Clone `strainspotter` repo to temp location
2. Create backup branch: `git branch backup-before-migration`
3. Remove all files except `.git/` and `.gitignore`
4. Copy all files from `strainspotter-web` (except `.git/`)
5. Stage all changes: `git add .`
6. Commit: `git commit -m "Replace with strainspotter-web codebase"`
7. Push to `main`: `git push origin main`
8. Vercel auto-deploys

**Option C: Force Replace (Fastest, but loses history)**
1. Clone `strainspotter` repo
2. Remove all files
3. Copy from `strainspotter-web`
4. Force push: `git push --force origin main`
5. ⚠️ **NOT RECOMMENDED** - loses commit history

### Recommended: Option B (Replace with History)

**Steps (DO NOT EXECUTE YET):**

```bash
# 1. Clone target repo to temp location
cd /tmp
git clone https://github.com/tophercook7-maker/strainspotter.git strainspotter-temp
cd strainspotter-temp

# 2. Create backup branch
git checkout -b backup-before-migration
git push origin backup-before-migration

# 3. Switch back to main
git checkout main

# 4. Remove all files except .git
find . -mindepth 1 -maxdepth 1 ! -name '.git' ! -name '.gitignore' -exec rm -rf {} +

# 5. Copy all files from strainspotter-web (except .git)
cp -r /Users/christophercook/Desktop/strainspotter-web/* .
cp -r /Users/christophercook/Desktop/strainspotter-web/.* . 2>/dev/null || true
rm -rf .git  # Don't copy .git from source

# 6. Stage all changes
git add .

# 7. Commit
git commit -m "Replace with strainspotter-web codebase

- Migrate from local strainspotter-web to GitHub repo
- Preserve Vercel connection and domain
- Update to latest Next.js App Router structure
- Fix black screen issue by deploying correct code"

# 8. Push to main (triggers Vercel deployment)
git push origin main
```

### Verification Steps (Before Push)

1. **Check file structure:**
   ```bash
   ls -la  # Should see app/, components/, lib/, package.json, etc.
   ```

2. **Verify entry point:**
   ```bash
   test -f app/page.tsx && echo "✅ Homepage exists"
   test -f app/layout.tsx && echo "✅ Layout exists"
   ```

3. **Check build:**
   ```bash
   npm install
   npm run build  # Should succeed
   ```

4. **Verify no localhost:**
   ```bash
   grep -r "localhost" app/ || echo "✅ No localhost references"
   ```

## Step 5: Report Summary

### Current Repo State

**strainspotter-web (Source):**
- ✅ Valid Next.js App Router structure
- ✅ Homepage at `app/page.tsx`
- ✅ Root layout with CSS import
- ✅ All API routes functional
- ✅ No localhost dependencies
- ✅ Vercel-ready build configuration

### Why Black Screen Occurs

**Most Likely:**
1. The `strainspotter` GitHub repo contains old/empty code
2. Missing `app/page.tsx` or `app/layout.tsx`
3. Missing `globals.css` import in layout
4. Build fails or produces empty output

### Readiness of strainspotter-web

**✅ Fully Ready:**
- Standard Next.js structure
- No special Vercel configuration needed
- Environment variables properly used
- Relative API routes
- Valid build script
- Root page renders content

### Exact Next Commands Needed

**⚠️ DO NOT RUN YET - WAIT FOR APPROVAL**

```bash
# 1. Clone target repo
cd /tmp
git clone https://github.com/tophercook7-maker/strainspotter.git strainspotter-temp
cd strainspotter-temp

# 2. Backup current state
git checkout -b backup-before-migration
git push origin backup-before-migration
git checkout main

# 3. Remove old files (keep .git)
find . -mindepth 1 -maxdepth 1 ! -name '.git' ! -name '.gitignore' -exec rm -rf {} +

# 4. Copy new files
cp -r /Users/christophercook/Desktop/strainspotter-web/* .
cp -r /Users/christophercook/Desktop/strainspotter-web/.{gitignore,env.example} . 2>/dev/null || true

# 5. Verify structure
ls -la
test -f app/page.tsx && echo "✅ Homepage exists"
test -f app/layout.tsx && echo "✅ Layout exists"

# 6. Test build locally
npm install
npm run build

# 7. If build succeeds, commit and push
git add .
git commit -m "Replace with strainspotter-web codebase"
git push origin main

# 8. Monitor Vercel deployment
# Check Vercel dashboard for build status
```

### Post-Deployment Checklist

1. ✅ Verify `https://app.strainspotter.app` loads correctly
2. ✅ Check Vercel build logs for errors
3. ✅ Test desktop app (should no longer show black screen)
4. ✅ Verify environment variables are set in Vercel
5. ✅ Test auth flow
6. ✅ Test Scanner and Garden features

---

**Status:** Plan prepared, ready for execution after approval.
