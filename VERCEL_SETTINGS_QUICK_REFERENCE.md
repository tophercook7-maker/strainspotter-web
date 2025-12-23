# Vercel Settings — Quick Reference Card

## ⚡ IMMEDIATE ACTION REQUIRED

**Go to**: https://vercel.com/tophercook7-makers-projects/strainspotter/settings/build-and-deployment

**Scroll to**: "Build & Development Settings"

**Change**: Framework Preset → Select **`Next.js`**

**Click**: Save

**Then**: Redeploy latest deployment

---

## ✅ CORRECT SETTINGS

| Setting | Value | Notes |
|---------|-------|-------|
| **Framework Preset** | **`Next.js`** | ⚠️ CRITICAL: Must be set to Next.js |
| Root Directory | (blank) or `.` | Project root |
| Build Command | **DEFAULT** | Auto: `npm run build` → `next build` |
| Output Directory | **DEFAULT** | Auto: `.next` |
| Install Command | **DEFAULT** | Auto: `npm install` |
| Node.js Version | `20.x` | Latest LTS recommended |

---

## 📋 PROJECT DETAILS

**Framework**: Next.js 16.0.7  
**React**: 19.2.0  
**Build Script**: `npm run build` → `next build`  
**Output Directory**: `.next` (Next.js default)  
**Project Structure**: App Router (`app/` directory)

---

## 🔍 WHY DETECTION FAILED

1. No `vercel.json` file (Vercel relies on auto-detection)
2. `netlify.toml` present (might confuse detection, but Vercel ignores it)
3. Framework Preset was never explicitly set
4. Vercel defaulted to "Other" framework

---

## ✅ VERIFICATION

After updating settings and redeploying:

1. Check deployment logs for: `"Detected Next.js version: 16.0.7"`
2. Verify build command: `next build`
3. Verify output directory: `.next`
4. Test `*.vercel.app` URL loads correctly
5. Test custom domains resolve correctly

---

## 📝 COPY-PASTE FOR VERCEL SUPPORT (if needed)

```
Project: strainspotter
Issue: Framework Preset was not set, causing 404 "Deployment Not Found" errors
Solution Applied: Set Framework Preset to "Next.js" in Build & Development Settings
Framework: Next.js 16.0.7
Build Command: npm run build (default)
Output Directory: .next (default)
Status: Settings updated, awaiting redeploy verification
```

---

**Last Updated**: Based on Vercel Support feedback (Framework Preset not set)
