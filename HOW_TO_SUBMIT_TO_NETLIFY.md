# How to Submit Report to Netlify Support

## Quick Steps

1. **Go to:** https://www.netlify.com/support/
2. **Scroll down** to find the support form
3. **Fill out the form** with the information below
4. **Copy/paste** the report content into the message field

---

## Form Fields to Fill

### 1. Email Address
- Enter the email associated with your Netlify account
- Example: `your-email@example.com`

### 2. Site Name
- Enter your Netlify site name
- You can find this in your Netlify dashboard
- Example: `strainspotter` or `strainspotter-web`

### 3. Subject
```
Critical: All domains returning 404 despite deployment showing as Published
```

### 4. Message/Description
Copy and paste the entire content from `NETLIFY_DEPLOYMENT_ISSUE_REPORT.md`

**OR** use this shorter version:

```
All configured domains for StrainSpotter are returning 404 errors, even though deployments show as "Published" and "Live" in the Netlify dashboard.

AFFECTED DOMAINS:
- www.strainspotter.app → 404 NOT_FOUND
- app.strainspotter.app → 404 NOT_FOUND  
- strainspotter.netlify.app → 404 NOT_FOUND

DEPLOYMENT STATUS:
- Latest commit: c8afe8d - "Clean slate: minimal Next.js website foundation"
- Status: Published/Live
- Framework: Next.js 16.0.7
- All domains are linked in dashboard

TECHNICAL DETAILS:
- DNS correctly configured (domains resolve to Netlify)
- SSL certificates valid
- Requests reach Netlify edge (x-nf-request-id present)
- Deployment shows as "Published" but not accessible

ACTIONS TAKEN:
1. Simplified codebase to minimal Next.js setup
2. Removed and re-added custom domains
3. Triggered fresh deployments
4. Verified app/page.tsx and app/layout.tsx exist

RESULT: All domains still return 404 despite deployment showing as published.

Please see attached detailed report for full technical information.
```

---

## Alternative: Email Support

If the form doesn't work, you can also:

1. **Email:** support@netlify.com
2. **Subject:** Critical: All domains returning 404 - Site: [your-site-name]
3. **Attach:** `NETLIFY_DEPLOYMENT_ISSUE_REPORT.md` file
4. **Include:** Your Netlify account email and site name

---

## What to Include

Make sure to include:
- ✅ Your Netlify account email
- ✅ Site name/ID from Netlify dashboard
- ✅ List of affected domains
- ✅ Deployment commit hash (c8afe8d)
- ✅ Screenshot of deployment status (if possible)
- ✅ Build logs (if available)

---

## After Submission

1. You should receive a confirmation email
2. Netlify support typically responds within 24-48 hours
3. Check your email (including spam folder) for updates
4. You can also check support status in your Netlify dashboard

---

**Good luck!** The report is comprehensive and should help Netlify quickly identify and resolve the issue.
