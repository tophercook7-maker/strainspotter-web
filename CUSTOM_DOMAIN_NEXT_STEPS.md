# Custom Domain Fix - Next Steps

## Current Status

**Domain is attached** to the `strainspotter` project, but still showing placeholder.

## Likely Issues

Since the domain is already attached, the problem is likely one of these:

### 1. Domain Pointing to Preview Instead of Production

**Check**: In Vercel domain settings, verify `app.strainspotter.app` is assigned to **Production** environment, not Preview.

**Fix**: 
- Click "Edit" on `app.strainspotter.app` domain
- Ensure "Connect to an environment" → "Production" is selected
- Save changes

### 2. Domain Needs Refresh

**Fix**:
- Click "Refresh" button next to `app.strainspotter.app` domain
- Wait 1-2 minutes for DNS propagation

### 3. DNS Propagation Delay

**Check**: DNS changes can take 5-60 minutes to propagate globally.

**Verify**:
```bash
# Check DNS resolution
dig app.strainspotter.app
# or
nslookup app.strainspotter.app
```

Should point to Vercel's CNAME: `cname.vercel-dns.com` or similar.

### 4. Wrong Deployment Assigned

**Check**: The domain might be pointing to an old/wrong deployment.

**Fix**:
- Go to Deployments page
- Find the Production deployment (from `clean-main` branch)
- Ensure domain is assigned to that specific deployment

## Quick Verification Steps

1. **Check domain assignment**:
   - Navigate to: `https://vercel.com/tophercook7-makers-projects/strainspotter/settings/domains`
   - Find `app.strainspotter.app` in the list
   - Click "Edit"
   - Verify it says "Production" (not "Preview")

2. **Check Production deployment**:
   - Navigate to: `https://vercel.com/tophercook7-makers-projects/strainspotter/deployments`
   - Find the latest deployment from `clean-main` branch
   - Verify it's marked as "Production"
   - Check if `app.strainspotter.app` is listed under that deployment's domains

3. **Refresh domain**:
   - Click "Refresh" button next to the domain
   - Wait 2-3 minutes
   - Test `app.strainspotter.app` again

## Expected Result

After fixing:
- `app.strainspotter.app` → Shows real StrainSpotter app (redirects to `/garden`)
- Same content as: `https://strainspotter-git-clean-main-tophercook7-makers-projects.vercel.app`
- No placeholder page
