# Vercel Deployment Fixes Required

## Critical Environment Variables

### Frontend Project on Vercel
Add these environment variables:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_BASE=https://YOUR_BACKEND.vercel.app
```

**Why this is critical:** Without `VITE_API_BASE`, the frontend tries to use Supabase REST API instead of your Express backend, causing all scan/strain/dispensary features to fail.

### Backend Project on Vercel
Add these environment variables:

```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
GOOGLE_VISION_JSON={"type":"service_account",...full JSON here...}
CORS_ALLOW_ORIGINS=https://YOUR_FRONTEND.vercel.app,https://strain-spotter-5yacb5q3m-tophercook7-makers-projects.vercel.app
```

## Issues Found & Fixes

### 1. ✅ Scanner stops without showing results
**Root Cause:** Frontend can't reach backend API (`VITE_API_BASE` not set)
**Fix:** Set `VITE_API_BASE` environment variable on Vercel frontend project

### 2. ✅ Scan History "failed to fetch scans"
**Root Cause:** Same - missing API_BASE configuration
**Fix:** Set `VITE_API_BASE` environment variable

### 3. ✅ Browse Strains "r.map is not a function"
**Root Cause:** API returns wrong data structure when hitting Supabase instead of backend
**Fix:** Set `VITE_API_BASE` + code fix to handle empty/malformed responses

### 4. 🔄 Grower Directory missing registration
**Fix:** Need to add registration form/button

### 5. 🔄 Dispensaries only shows 2 CA locations
**Fix:** Needs Google Places API integration for better results

### 6. 🔄 Seeds "inp issue" popup
**Fix:** Need to investigate and fix the error

### 7. 🔄 Help content needs app-focused content
**Fix:** Rewrite help content for app setup

### 8. 🔄 Feedback not sending to strainspotterfeedback@gmail.com
**Fix:** Backend email configuration needed

## Deployment Steps

1. Add all environment variables to Vercel projects
2. Redeploy both frontend and backend
3. Test each feature
4. Report remaining issues
