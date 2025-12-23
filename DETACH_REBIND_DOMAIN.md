# Detach and Rebind Domain on Vercel

## Steps to Fix 404 Error

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/tophercook7-makers-projects/strainspotter/settings/domains
   - Or: https://vercel.com → Your Project → Settings → Domains

2. **Find the Domain:**
   - Look for `strainspotter.app` in your domains list
   - Also check for `app.strainspotter.app` if that's the one showing 404

3. **Remove the Domain:**
   - Click the three dots (⋯) menu next to the domain
   - Select "Remove" or "Delete"
   - Confirm the removal

4. **Re-add the Domain:**
   - Click "Add Domain" button
   - Enter: `strainspotter.app` (or `app.strainspotter.app`)
   - Select "Production" branch
   - Click "Add"

5. **Wait 2-5 minutes:**
   - Vercel will refresh the edge alias
   - DNS propagation may take a few minutes

6. **Verify:**
   - Check: https://app.strainspotter.app
   - Should show the safe root page: "StrainSpotter" and "Deployment OK."

## Alternative: Use Vercel CLI

If you have Vercel CLI installed:
```bash
vercel domains ls
vercel domains rm strainspotter.app
vercel domains add strainspotter.app
```
