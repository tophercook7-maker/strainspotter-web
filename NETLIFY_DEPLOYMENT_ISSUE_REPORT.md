# Deployment Issue Report - StrainSpotter

**Date:** December 21, 2025  
**Project:** strainspotter-web  
**Platform:** Netlify  
**Issue:** All domains returning 404 despite deployment showing as "Published" and "Live"

---

## Summary

All configured domains for the StrainSpotter project are returning 404 errors, even though the deployment shows as "Published" and is assigned to "Production" in the Netlify dashboard. This includes both custom domains and the default Netlify-provided domain.

---

## Test Results

### Domain Test Results

| Domain | Status Code | Error | Notes |
|--------|-------------|-------|-------|
| `strainspotter.app` | 307 | Redirect | Redirects to `www.strainspotter.app` |
| `www.strainspotter.app` | 404 | `NOT_FOUND` | Returns 404 error |
| `app.strainspotter.app` | 404 | `NOT_FOUND` | Returns 404 error |
| `strainspotter.netlify.app` | 404 | `NOT_FOUND` | Default Netlify domain also returns 404 |

### HTTP Headers Analysis

**All domains show:**
- `server: Netlify` (confirms DNS is pointing to Netlify)
- `x-nf-request-id: [id]` (shows requests are reaching Netlify edge)
- 404 status codes across all domains

**SSL Certificate:**
- Valid SSL certificate for `*.strainspotter.app`
- Certificate valid from Dec 18, 2025 to Mar 18, 2026
- DNS resolution working correctly

---

## Deployment Information

### Latest Deployment
- **Deployment ID:** (Please check Netlify dashboard)
- **Commit:** `c8afe8d` - "Clean slate: minimal Next.js website foundation"
- **Branch:** `main`
- **Status in Dashboard:** ✅ Published/Live
- **Production Assignment:** ✅ Yes
- **Domains Linked:** `app.strainspotter.app`, `www.strainspotter.app`

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
3. ✅ Removed and re-added custom domains in Netlify dashboard
4. ✅ Triggered fresh deployment with new commit
5. ✅ Redeployed from Netlify dashboard
6. ✅ Verified deployment shows as "Published" and "Live"

**Result:** All domains still return 404 despite deployment showing as published.

---

## Error Details

### Error Messages
- **Custom domains:** `404: NOT_FOUND`
- **Default domain:** `404: NOT_FOUND`

### Error Pattern
The error indicates that:
1. DNS is correctly configured (domains resolve to Netlify IPs)
2. SSL certificates are valid
3. Requests reach Netlify's edge network
4. Netlify cannot find/access the deployment despite it showing as "Published"

This suggests a **deployment routing issue** or **edge cache problem** at the Netlify platform level.

---

## Netlify Dashboard Status

**Deployment Page Shows:**
- ✅ Deployment status: "Published" / "Live"
- ✅ Production assignment: Yes
- ✅ Domains are linked: `app.strainspotter.app`, `www.strainspotter.app`
- ✅ Commit message visible: "Clean slate: minimal Next.js website foundation"
- ✅ Branch: `main`

**However:**
- ❌ All domain URLs return 404
- ❌ Even default `netlify.app` domain returns 404

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

### Netlify Configuration
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

---

## Request for Support

**Issue Type:** Platform/Infrastructure  
**Severity:** Critical (site completely inaccessible)

**What we need:**
1. Investigation into why deployments showing as "Published" are not accessible
2. Resolution of routing/edge cache issues for all domains
3. Verification that the latest deployment is actually accessible at the edge
4. Clear cache/rebuild if necessary

**Additional Context:**
- This issue persists across multiple deployments
- Previous deployments also showed as "Published" but returned 404
- Domain rebinding did not resolve the issue
- Fresh deployments still result in the same 404 errors
- The codebase is minimal and should deploy successfully

---

## Contact Information

**Site Name:** (Please fill in from Netlify dashboard)  
**Site ID:** (Please fill in from Netlify dashboard)  
**Team/Account:** (Please fill in)

---

## Test Commands for Verification

```bash
# Test apex domain
curl -I https://strainspotter.app

# Test www subdomain
curl -I https://www.strainspotter.app

# Test app subdomain
curl -I https://app.strainspotter.app

# Test default Netlify domain
curl -I https://strainspotter.netlify.app
```

All commands return 404 errors.

---

## Additional Information

**Build Logs:** (Please attach recent build logs from Netlify dashboard)  
**Deployment Logs:** (Please attach recent deployment logs)  
**Domain Configuration:** (Please include screenshot of domain settings from Netlify dashboard)

---

**Report Generated:** December 21, 2025  
**Status:** Awaiting Netlify support resolution
