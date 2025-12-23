# Vercel 404 Fix Report

## Current Status (Verified)

### Domain Status Check

**app.strainspotter.app:**
- HTTP Status: **404**
- Error Header: `x-vercel-error: NOT_FOUND`
- Request ID: `iad1::b8qcw-1766367178102-b90c2082aaa1`
- Server: Vercel (confirmed)
- **Issue:** Domain is pointing to non-existent deployment

**strainspotter.app:**
- HTTP Status: **307 Redirect**
- Redirects to: `https://www.strainspotter.app/`
- **Issue:** Redirecting to www subdomain (may not be configured)

---

## Diagnosis Results

### 1) Does the latest *.vercel.app Production deployment load?

**ACTION REQUIRED:** 
- Go to Vercel Dashboard → Your Project → Deployments
- Find latest Production deployment
- Click the `*.vercel.app` URL (e.g., `strainspotter-web-xyz.vercel.app`)
- **Test:** Does this URL load correctly?

**If YES:** Problem is domain binding/DNS
**If NO:** Problem is deployment/build (fix deployment first)

---

### 2) Are build settings default (no frontend/ custom)?

**VERIFIED IN CODEBASE:**
- ✅ `package.json` build script: `"build": "next build"` (default)
- ✅ `next.config.ts`: Minimal config, no custom paths
- ✅ No `vercel.json` with custom build settings
- ✅ Root directory: Repo root (no `frontend/` reference)

**ACTION REQUIRED:**
- Go to Vercel Dashboard → Your Project → Settings → General
- Verify:
  - Framework Preset: **Next.js**
  - Root Directory: **(blank)** or **"."**
  - Build Command: **(default/auto)** or `npm run build`
  - Output Directory: **(default/auto)**
  - Install Command: **(default/auto)** or `npm install`

**If you see ANY custom paths like `frontend/` in build settings:**
- Remove them immediately
- Set to DEFAULT
- Redeploy

---

### 3) Exact Porkbun DNS Records Required

**Current Required Configuration:**

**Apex Domain (strainspotter.app):**
```
Type: A
Host: @ (or blank/root)
Answer: 76.76.21.21
TTL: 3600 (or default)
```

**Subdomain (app.strainspotter.app):**
```
Type: CNAME
Host: app
Answer: cname.vercel-dns.com
TTL: 3600 (or default)
```

**⚠️ REMOVE if they exist:**
- Any other A records for `@`
- Any AAAA records for `@` (unless Vercel requires)
- Any CNAME for `@` (CNAME cannot coexist with A at apex)
- Any URL forwarding for these hosts
- Any conflicting CNAME for `app` pointing elsewhere

**ACTION REQUIRED:**
1. Log into Porkbun DNS management
2. Verify/update records to match above
3. Wait 5-10 minutes for propagation
4. Use Vercel's Domain checker to verify

---

### 4) Domain Status in Vercel

**ACTION REQUIRED:**
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Check status for both domains:
   - `app.strainspotter.app` - Should show "Valid" or "Invalid Configuration"
   - `strainspotter.app` - Should show "Valid" or "Invalid Configuration"

**If status is "Invalid Configuration":**
- Vercel will show exact DNS records needed
- Update Porkbun to match exactly
- Wait for propagation
- Re-check in Vercel

**If domains are missing:**
- Add `app.strainspotter.app` → Set as Primary
- Add `strainspotter.app` → Set Redirect to `app.strainspotter.app`
- Assign both to Production deployment

**If domains exist but show errors:**
1. Remove domain from project
2. Wait 30 seconds
3. Re-add domain
4. Assign to Production deployment
5. Wait 5-10 minutes

---

### 5) DEPLOYMENT_NOT_FOUND Error Confirmed

**Current Error:**
- `x-vercel-error: NOT_FOUND`
- Request ID: `iad1::b8qcw-1766367178102-b90c2082aaa1`

**This indicates:**
- Domain is bound to Vercel (server responds)
- But domain alias is pointing to a non-existent deployment
- This is an edge alias routing issue

**Solution Steps:**

**Step A: Verify Production Deployment Exists**
1. Go to Vercel Dashboard → Deployments
2. Confirm latest Production deployment is "Ready" (green)
3. Note the deployment URL (`*.vercel.app`)
4. Test if that URL loads

**Step B: Re-bind Domain to Production**
1. Go to Settings → Domains
2. For `app.strainspotter.app`:
   - Click "..." → "Edit"
   - Ensure "Production" is selected
   - If it shows a deployment ID, verify it matches latest Production
   - Save
3. Wait 5-10 minutes
4. Test again

**Step C: If Still 404 - Contact Vercel Support**

**Support Request Template:**
```
Subject: Domain 404 - NOT_FOUND error - Edge alias routing issue

Project: [Your Project Name]
Domains: app.strainspotter.app, strainspotter.app
Issue: Custom domains return 404 with NOT_FOUND in x-vercel-error header
Deployment URL: [*.vercel.app URL from dashboard]
Deployment Status: [Ready/Failed - from dashboard]
DNS Configuration: 
  - A @ 76.76.21.21 (apex)
  - CNAME app cname.vercel-dns.com (subdomain)
Request ID: iad1::b8qcw-1766367178102-b90c2082aaa1
Error Header: x-vercel-error: NOT_FOUND

Request: Please flush/repair edge alias mapping for these domains and ensure they point to the latest Production deployment.
```

---

## Immediate Action Checklist

- [ ] **Step 1:** Verify `*.vercel.app` deployment URL loads
- [ ] **Step 2:** Check Vercel build settings (no `frontend/` paths)
- [ ] **Step 3:** Verify Porkbun DNS records match requirements
- [ ] **Step 4:** Check domain status in Vercel (Valid/Invalid)
- [ ] **Step 5:** Re-bind domains to Production deployment
- [ ] **Step 6:** If still 404, contact Vercel support with request template

---

## Expected DNS Records (Porkbun)

**For strainspotter.app (apex):**
```
A Record:
  Host: @
  Type: A
  Answer: 76.76.21.21
  TTL: 3600
```

**For app.strainspotter.app (subdomain):**
```
CNAME Record:
  Host: app
  Type: CNAME
  Answer: cname.vercel-dns.com
  TTL: 3600
```

**Note:** Vercel may show a different CNAME value. Use the EXACT value Vercel displays in Settings → Domains.

---

## Next Steps

1. **First Priority:** Verify Production deployment exists and `*.vercel.app` URL works
2. **Second Priority:** Re-bind domains to Production in Vercel
3. **Third Priority:** Verify DNS records in Porkbun match Vercel requirements
4. **If still failing:** Contact Vercel support with the template above

---

## Reference

- Error confirmed: `x-vercel-error: NOT_FOUND`
- Request ID: `iad1::b8qcw-1766367178102-b90c2082aaa1`
- Server: Vercel (confirmed)
- This pattern matches edge alias routing corruption issues reported in Vercel community
