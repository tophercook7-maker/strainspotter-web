# Vercel Framework Preset Fix — COMPLETE GUIDE

## Problem Identified

Vercel support confirmed: **NO Framework Preset is set**, causing Vercel to default to "Other" framework. This prevents Vercel from:
- Auto-detecting the build output directory
- Applying Next.js-specific optimizations
- Correctly serving the application

**Result**: 404 "Deployment Not Found" errors

---

## Project Analysis

### Framework Identification ✅

**Framework**: **Next.js 16.0.7**

**Evidence**:
- `package.json` contains `"next": "16.0.7"`
- `package.json` scripts: `"build": "next build"`, `"dev": "next dev"`
- `next.config.ts` exists in project root
- `app/` directory structure (App Router)
- `app/layout.tsx` uses Next.js App Router conventions

**Build Output**: `.next` (Next.js default)

---

## Vercel Settings Configuration

### Required Settings

Go to: **Vercel Dashboard → Settings → Build & Development Settings**

**Project Settings Link**: https://vercel.com/tophercook7-makers-projects/strainspotter/settings/build-and-deployment

### Framework Preset

**Set to**: `Next.js`

**Why**: This is a Next.js 16.0.7 project using the App Router. Vercel needs to know this to:
- Auto-detect build output directory (`.next`)
- Apply Next.js optimizations (ISR, edge functions, etc.)
- Correctly serve static assets and API routes

### Build & Development Settings

**Root Directory**: 
- Leave **blank** (or set to `.`)
- Project root is the repository root

**Framework Preset**: 
- **MUST BE**: `Next.js`
- **NOT**: "Other" or blank

**Build Command**: 
- **DEFAULT** (auto-detected: `npm run build`)
- Should resolve to: `next build`
- **DO NOT** set custom commands unless necessary

**Output Directory**: 
- **DEFAULT** (auto-detected: `.next`)
- Next.js outputs to `.next` directory
- **DO NOT** set custom output directory

**Install Command**: 
- **DEFAULT** (auto-detected: `npm install`)
- Should resolve to: `npm install`
- **DO NOT** set custom commands unless necessary

**Node.js Version**: 
- **Recommended**: `20.x` (or latest LTS)
- Check `package.json` for `engines.node` if specified

---

## Verification Checklist

After updating settings:

1. ✅ **Framework Preset** = `Next.js` (NOT "Other")
2. ✅ **Root Directory** = blank or `.`
3. ✅ **Build Command** = DEFAULT (auto-detected)
4. ✅ **Output Directory** = DEFAULT (auto-detected)
5. ✅ **Install Command** = DEFAULT (auto-detected)

---

## Why Framework Detection Failed

### Possible Reasons

1. **No `vercel.json` file**: 
   - Vercel relies on framework detection from `package.json` and project structure
   - If detection fails, it defaults to "Other"

2. **`netlify.toml` present**: 
   - File exists: `netlify.toml`
   - This might confuse Vercel's auto-detection
   - **Solution**: Vercel ignores `netlify.toml`, but ensure Framework Preset is explicitly set

3. **Project structure**: 
   - While `app/` directory exists, Vercel might not have detected it automatically
   - **Solution**: Explicitly set Framework Preset to `Next.js`

4. **Build configuration**: 
   - `next.config.ts` is minimal (no custom output settings)
   - This is fine, but Vercel needs explicit framework selection

---

## Action Steps

### Step 1: Update Vercel Settings

1. Go to: https://vercel.com/tophercook7-makers-projects/strainspotter/settings/build-and-deployment
2. Scroll to **"Build & Development Settings"**
3. Find **"Framework Preset"** dropdown
4. Select: **`Next.js`**
5. Verify other settings are set to **DEFAULT** (auto-detect)
6. Click **"Save"**

### Step 2: Trigger New Deployment

After saving settings:

1. Go to **Deployments** tab
2. Click **"Redeploy"** on latest deployment, OR
3. Push a new commit to trigger automatic deployment

### Step 3: Verify Deployment

1. Wait for deployment to complete
2. Check deployment logs for:
   - ✅ "Detected Next.js" or similar message
   - ✅ Build command: `next build`
   - ✅ Output directory: `.next`
   - ✅ No "Framework not detected" warnings

3. Test deployment URL:
   - `*.vercel.app` URL should load correctly
   - Custom domains should resolve correctly

---

## Expected Build Output

With Framework Preset = `Next.js`, Vercel should:

1. **Detect Next.js automatically**:
   ```
   Detected Next.js version: 16.0.7
   ```

2. **Run correct build command**:
   ```
   Running "npm run build"
   > next build
   ```

3. **Output to correct directory**:
   ```
   Output Directory: .next
   ```

4. **Serve correctly**:
   - Static files from `public/`
   - App Router pages from `app/`
   - API routes from `app/api/`
   - Middleware from `middleware.ts`

---

## Additional Configuration (Optional)

### Create `vercel.json` (Optional, but recommended)

If you want explicit control, create `vercel.json` in project root:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install"
}
```

**Note**: With Framework Preset set to `Next.js`, this is usually not necessary, but can help with explicit configuration.

---

## Troubleshooting

### Issue: Framework Preset dropdown doesn't show "Next.js"

**Solution**: 
- Check that `package.json` contains `"next"` dependency
- Ensure `next.config.ts` or `next.config.js` exists
- Try refreshing the Vercel dashboard

### Issue: Build still fails after setting Framework Preset

**Solution**:
- Check build logs for specific errors
- Verify `package.json` has correct `"build"` script
- Ensure all dependencies are listed in `package.json`
- Check for TypeScript errors: `npm run build` locally

### Issue: Deployment works but custom domain still 404s

**Solution**:
- This is a separate issue (domain binding)
- See `VERCEL_404_DIAGNOSIS.md` for domain-specific fixes
- Framework Preset fix should resolve deployment issues, but domain binding is separate

---

## Summary

**Root Cause**: Framework Preset not set → Vercel defaults to "Other" → Can't find build output → 404 errors

**Solution**: Set Framework Preset to `Next.js` in Vercel project settings

**Expected Result**: 
- ✅ Vercel detects Next.js correctly
- ✅ Build output directory auto-detected (`.next`)
- ✅ Deployment serves correctly
- ✅ No more "Deployment Not Found" errors

---

## Quick Reference

**Vercel Settings URL**: https://vercel.com/tophercook7-makers-projects/strainspotter/settings/build-and-deployment

**Framework Preset**: `Next.js`

**Build Command**: DEFAULT (auto: `npm run build`)

**Output Directory**: DEFAULT (auto: `.next`)

**Root Directory**: blank or `.`

---

## Verification Command

After deployment, verify framework detection:

```bash
# Check deployment logs in Vercel dashboard
# Should see: "Detected Next.js version: 16.0.7"
```

---

**Status**: ✅ Configuration identified, ready for Vercel settings update
