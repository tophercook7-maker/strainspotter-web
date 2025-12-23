# Deployment Issue Report - StrainSpotter

**Date:** December 21, 2025  
**Project:** strainspotter-web  
**Platform:** Vercel  
**Issue:** All domains returning 404 despite deployment showing as "Ready" and "Production"

---

## Summary

All configured domains for the StrainSpotter project are returning 404 errors, even though the deployment shows as "Ready" and is assigned to "Production" in the Vercel dashboard. This includes both custom domains and the default Vercel-provided domain.

---

## Test Results

### Domain Test Results

| Domain | Status Code | Error | Notes |
|--------|-------------|-------|-------|
| `strainspotter.app` | 307 | Redirect | Redirects to `www.strainspotter.app` |
| `www.strainspotter.app` | 404 | `NOT_FOUND` | Returns 404 error |
| `app.strainspotter.app` | 404 | `NOT_FOUND` | Returns 404 error |
| `strainspotter.vercel.app` | 404 | `NOT_FOUND` | Default Vercel domain also returns 404 |
| `strainspotter-ajh0lmqze-tophercook7-maker-project.vercel.app` | 404 | `DEPLOYMENT_NOT_FOUND` | Direct deployment URL returns `DEPLOYMENT_NOT_FOUND` |

### HTTP Headers Analysis

**All domains show:**
- `server: Vercel` (confirms DNS is pointing to Vercel)
- `x-vercel-error: NOT_FOUND` or `DEPLOYMENT_NOT_FOUND`
- `x-vercel-id: iad1::[id]` (shows requests are reaching Vercel edge)

**SSL Certificate:**
- Valid SSL certificate for `*.strainspotter.app`
- Certificate valid from Dec 18, 2025 to Mar 18, 2026
- DNS resolution working correctly

---

## Deployment Information

### Latest Deployment
- **Deployment ID:** `6JB18yBop`
- **Commit:** `c8afe8d` - "Clean slate: minimal Next.js website foundation"
- **Branch:** `main`
- **Status in Dashboard:** ✅ Ready
- **Production Assignment:** ✅ Yes
- **Domains Linked:** `app.strainspotter.app`

### Application Details
- **Framework:** Next.js 16.0.7
- **Node Version:** (default)
- **Build Command:** `next build`
- **Output Directory:** `.next`

### Code Status
The application has been simplified to a minimal Next.js setup:
- Minimal `app/layout.tsx` with basic metadata
- Simple `app/page.tsx` with clean homepage
- Minimal `next.config.ts` (only React strict mode)
- Clean `globals.css` (only Tailwind import)

**Files:**
- `app/layout.tsx` - Basic root layout
- `app/page.tsx` - Simple homepage component
- `app/globals.css` - Minimal Tailwind CSS
- `next.config.ts` - Minimal configuration

---

## Actions Taken

1. ✅ Simplified codebase to minimal Next.js setup
2. ✅ Verified `app/page.tsx` and `app/layout.tsx` exist and are valid
3. ✅ Removed and re-added custom domains in Vercel dashboard
4. ✅ Triggered fresh deployment with new commit
5. ✅ Redeployed from Vercel dashboard
6. ✅ Verified deployment shows as "Ready" and "Production"

**Result:** All domains still return 404 despite deployment showing as ready.

---

## Error Details

### Error Messages
- **Custom domains:** `404: NOT_FOUND` with `x-vercel-error: NOT_FOUND`
- **Deployment URL:** `404: NOT_FOUND` with `x-vercel-error: DEPLOYMENT_NOT_FOUND`

### Error Pattern
The error indicates that:
1. DNS is correctly configured (domains resolve to Vercel IPs)
2. SSL certificates are valid
3. Requests reach Vercel's edge network
4. Vercel cannot find/access the deployment despite it showing as "Ready"

This suggests an **edge alias binding issue** or **deployment accessibility problem** at the Vercel platform level.

---

## Vercel Dashboard Status

**Deployment Page Shows:**
- ✅ Deployment status: "This deployment is ready"
- ✅ Production assignment: Yes
- ✅ Domain `app.strainspotter.app` is linked
- ✅ Commit message visible: "Clean slate: minimal Next.js website foundation"
- ✅ Branch: `main`

**However:**
- ❌ All domain URLs return 404
- ❌ Direct deployment URLs return `DEPLOYMENT_NOT_FOUND`
- ❌ Even default `vercel.app` domain returns 404

---

## Technical Details

### Project Configuration
```json
{
  "name": "strainspotter-web",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "16.0.7",
    "react": "19.2.0",
    "react-dom": "19.2.0"
  }
}
```

### Next.js Config
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

### File Structure
```
app/
├── layout.tsx    (Root layout with metadata)
├── page.tsx      (Homepage component)
└── globals.css   (Tailwind CSS import)
```

---

## Request for Support

**Issue Type:** Platform/Infrastructure  
**Severity:** Critical (site completely inaccessible)

**What we need:**
1. Investigation into why deployments showing as "Ready" are not accessible
2. Resolution of edge alias binding for all domains
3. Verification that deployment `6JB18yBop` is actually accessible at the edge

**Additional Context:**
- This issue persists across multiple deployments
- Previous deployments also showed as "Ready" but returned 404
- Domain rebinding did not resolve the issue
- Fresh deployments still result in the same 404 errors

---

## Contact Information

**Project:** strainspotter  
**Team/Account:** tophercook7-maker  
**Deployment URL:** https://vercel.com/tophercook7-makers-projects/strainspotter/6JB18yBop

---

## Test Commands for Verification

```bash
# Test apex domain
curl -I https://strainspotter.app

# Test www subdomain
curl -I https://www.strainspotter.app

# Test app subdomain
curl -I https://app.strainspotter.app

# Test default Vercel domain
curl -I https://strainspotter.vercel.app

# Test direct deployment URL
curl -I https://strainspotter-ajh0lmqze-tophercook7-maker-project.vercel.app
```

All commands return 404 errors with `x-vercel-error: NOT_FOUND` or `DEPLOYMENT_NOT_FOUND`.

---

**Report Generated:** December 21, 2025  
**Status:** Awaiting platform support resolution
