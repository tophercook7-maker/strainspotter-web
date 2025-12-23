# Vercel 404 Diagnosis & Fix Guide

## Current Status Check

### STEP 1 — CONFIRM PRODUCTION DEPLOYMENT EXISTS

**Action Required:**
1. Go to Vercel Dashboard → Your Project → Deployments tab
2. Check if latest Production deployment exists and is "Ready" (green checkmark)
3. Click the deployment URL (e.g., `strainspotter-web-xyz.vercel.app`)
4. **CRITICAL:** Does the `*.vercel.app` URL load correctly?
   - ✅ YES → Problem is domain binding/DNS
   - ❌ NO → Problem is deployment/build (fix this first)

**Build Settings to Verify:**
- Framework Preset: **Next.js**
- Root Directory: **(blank)** or **"."** (repo root)
- Build Command: **DEFAULT** (should be `npm run build` or auto-detected)
- Output Directory: **DEFAULT** (should be auto-detected)
- Install Command: **DEFAULT** (should be `npm install` or auto-detected)

**⚠️ CRITICAL:** If you see ANY custom build commands referencing `frontend/` directory:
- Remove them immediately
- Set to DEFAULT/auto-detect
- Redeploy

---

### STEP 2 — DOMAIN BINDING IN VERCEL

**Action Required:**
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Verify BOTH domains are added:
   - `app.strainspotter.app`
   - `strainspotter.app`

**If domains are missing:**
1. Click "Add Domain"
2. Enter `app.strainspotter.app` → Add
3. Enter `strainspotter.app` → Add
4. Set Primary Domain to: `app.strainspotter.app`
5. For `strainspotter.app`, set Redirect to: `app.strainspotter.app`

**If domains show "Invalid Configuration":**
- Vercel will display exact DNS records needed
- Copy those records exactly
- Update Porkbun DNS (see Step 3)

**If domains exist but still 404:**
1. Remove domain from project
2. Wait 30 seconds
3. Re-add domain to project
4. Assign to Production deployment
5. Wait for DNS propagation (5-10 minutes)

---

### STEP 3 — DNS RECORDS IN PORKBUN

**Required DNS Records:**

**For apex domain (strainspotter.app):**
- Type: **A**
- Host: **@** (or blank/root)
- Answer: **76.76.21.21** (Vercel's apex IP)
- TTL: **3600** (or default)

**For subdomain (app.strainspotter.app):**
- Type: **CNAME**
- Host: **app**
- Answer: **cname.vercel-dns.com** (or exact value Vercel shows)
- TTL: **3600** (or default)

**⚠️ REMOVE these if they exist:**
- Any other A records for `@`
- Any AAAA records for `@` (unless Vercel specifically requires)
- Any CNAME records for `@` (CNAME cannot coexist with A at apex)
- Any URL forwarding/redirects for these hosts
- Any conflicting CNAME for `app` pointing elsewhere

**After updating DNS:**
1. Wait 5-10 minutes for propagation
2. Use Vercel's Domain checker in Settings → Domains
3. Verify DNS shows "Valid" status

---

### STEP 4 — CHECK FOR DEPLOYMENT_NOT_FOUND ERROR

**Action Required:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Visit `https://app.strainspotter.app`
4. Check the main document request headers
5. Look for `x-vercel-error` header

**If `x-vercel-error: DEPLOYMENT_NOT_FOUND`:**
- This indicates corrupted edge alias mapping
- The domain is pointing to a deleted/non-existent deployment
- **Solution:** Contact Vercel support with:
  - Project name
  - Domains: `app.strainspotter.app`, `strainspotter.app`
  - Request ID from response headers
  - Request: "Please flush/repair edge alias mapping for these domains"

**If `*.vercel.app` works but custom domain 404s:**
- Problem is domain binding, not deployment
- Follow Step 2 to re-bind domains

---

### STEP 5 — VERCEL PROJECT SETTINGS CHECKLIST

**Verify in Settings → General:**
- ✅ Framework Preset: Next.js
- ✅ Root Directory: (blank) or "."
- ✅ Build Command: (default/auto)
- ✅ Output Directory: (default/auto)
- ✅ Install Command: (default/auto)
- ✅ Node.js Version: 20.x (or latest LTS)

**Verify in Settings → Environment Variables:**
- All required env vars are set
- No typos in variable names
- Production environment selected

---

### STEP 6 — FORCE REDEPLOY

**If deployment exists but domains still 404:**
1. Go to Deployments tab
2. Find latest Production deployment
3. Click "..." → "Redeploy"
4. Wait for deployment to complete
5. Verify `*.vercel.app` URL still works
6. Check custom domains again

---

## Quick Diagnostic Commands

**Check DNS propagation:**
```bash
# Check A record for apex
dig strainspotter.app A

# Check CNAME for subdomain
dig app.strainspotter.app CNAME

# Should show Vercel's IP/CNAME
```

**Check Vercel deployment:**
```bash
# Get deployment URL from Vercel dashboard
curl -I https://strainspotter-web-xyz.vercel.app

# Should return 200 OK, not 404
```

---

## Common Issues & Solutions

### Issue: `*.vercel.app` works, custom domain 404s
**Solution:** Domain binding issue → Re-add domains in Vercel

### Issue: Both `*.vercel.app` and custom domain 404
**Solution:** Deployment issue → Check build logs, fix errors, redeploy

### Issue: DEPLOYMENT_NOT_FOUND in headers
**Solution:** Edge alias corruption → Contact Vercel support

### Issue: DNS shows "Invalid Configuration"
**Solution:** Update Porkbun DNS to match Vercel's exact requirements

### Issue: Build fails with "frontend/" errors
**Solution:** Remove custom build commands, use defaults

---

## Support Request Template (If Needed)

**Subject:** Domain 404 - DEPLOYMENT_NOT_FOUND error

**Body:**
```
Project: [Your Project Name]
Domains: app.strainspotter.app, strainspotter.app
Issue: Custom domains return 404 with DEPLOYMENT_NOT_FOUND in x-vercel-error header
Deployment URL: [*.vercel.app URL] - This works correctly
DNS: Configured per Vercel requirements (A @ 76.76.21.21, CNAME app cname.vercel-dns.com)
Request: Please flush/repair edge alias mapping for these domains
Request ID: [From response headers]
```

---

## Current Configuration Status

**Build Settings:**
- ✅ Framework: Next.js (auto-detected)
- ✅ Root Directory: Repo root (no custom path)
- ✅ Build Command: `npm run build` (default)
- ✅ No "frontend/" references in build config

**Next Steps:**
1. Verify production deployment exists and loads
2. Check domain bindings in Vercel
3. Verify DNS records in Porkbun
4. Check for DEPLOYMENT_NOT_FOUND error
5. Follow up with Vercel support if needed
