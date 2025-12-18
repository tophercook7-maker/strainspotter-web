# 🌿 StrainSpotter Complete Setup & Deployment Guide

## 📋 Current Status

### ✅ What's Working:
- ✅ Database: All tables exist (profiles, scans, seed_vendors, dispensaries, conversations, messages, moderators)
- ✅ Backend API: Running locally on http://localhost:5181
- ✅ Seed Vendors: 5 vendors in database (ILGM, Seedsman, Crop King, Herbies, MSNL)
- ✅ Dispensaries: 5 dispensaries in database (MedMen, The Pottery, Cookies, Harborside, SPARC)
- ✅ Scans: Working (Topher has 5 successful scans)

### ⚠️ What Needs Setup:
- ⚠️ **Topher & Andrew**: Need admin profiles and 999 credits
- ⚠️ **Vercel Deployment**: Environment variables need to be set
- ⚠️ **Grower Profiles API**: Endpoint returns 404 (needs route fix)
- ⚠️ **Messages API**: Returns 400 (needs user_id parameter)

---

## 🎯 STEP 1: Setup Admin Profiles (YOU & ANDREW)

### Run This SQL in Supabase SQL Editor:

**File:** `backend/migrations/SETUP_ADMINS.sql`

```sql
-- Setup Topher as Admin/Owner/Moderator
UPDATE profiles SET
  display_name = 'Topher Cook',
  avatar_url = 'https://api.dicebear.com/7.x/bottts/svg?seed=topher&backgroundColor=10b981',
  bio = 'Founder & Head Cultivator of StrainSpotter 🌿',
  is_grower = true,
  grower_license_status = 'licensed',
  grower_experience_years = 15,
  grower_bio = 'Founder of StrainSpotter with 15+ years of cultivation experience.',
  grower_specialties = ARRAY['indoor', 'outdoor', 'organic', 'hydroponics'],
  grower_city = 'Denver',
  grower_state = 'Colorado',
  grower_farm_name = 'StrainSpotter HQ',
  grower_listed_in_directory = true,
  grower_directory_consent_date = now(),
  grower_accepts_messages = true,
  grower_image_approved = true,
  scan_credits = 999
WHERE id = '2d3d5906-a5cc-4bca-a6de-c98586728dfa';

-- Make Topher a moderator
INSERT INTO moderators (user_id, assigned_by, permissions, is_active)
VALUES (
  '2d3d5906-a5cc-4bca-a6de-c98586728dfa',
  '2d3d5906-a5cc-4bca-a6de-c98586728dfa',
  ARRAY['moderate_messages', 'moderate_images', 'warn_users', 'suspend_users', 'ban_users'],
  true
)
ON CONFLICT (user_id) DO UPDATE SET
  permissions = ARRAY['moderate_messages', 'moderate_images', 'warn_users', 'suspend_users', 'ban_users'],
  is_active = true;

-- Setup Andrew Beck as Admin/Owner/Moderator
UPDATE profiles SET
  display_name = 'Andrew Beck',
  avatar_url = 'https://api.dicebear.com/7.x/bottts/svg?seed=andrew&backgroundColor=3b82f6',
  bio = 'Co-Founder of StrainSpotter 🌿',
  is_grower = true,
  grower_license_status = 'licensed',
  grower_experience_years = 12,
  grower_bio = 'Co-Founder of StrainSpotter with 12+ years of cultivation experience.',
  grower_specialties = ARRAY['indoor', 'organic', 'breeding'],
  grower_city = 'Denver',
  grower_state = 'Colorado',
  grower_farm_name = 'StrainSpotter HQ',
  grower_listed_in_directory = true,
  grower_directory_consent_date = now(),
  grower_accepts_messages = true,
  grower_image_approved = true,
  scan_credits = 999
WHERE id = '237fc1d6-3c5e-4a50-b01a-f71fcd825768';

-- Make Andrew a moderator
INSERT INTO moderators (user_id, assigned_by, permissions, is_active)
VALUES (
  '237fc1d6-3c5e-4a50-b01a-f71fcd825768',
  '2d3d5906-a5cc-4bca-a6de-c98586728dfa',
  ARRAY['moderate_messages', 'moderate_images', 'warn_users', 'suspend_users', 'ban_users'],
  true
)
ON CONFLICT (user_id) DO UPDATE SET
  permissions = ARRAY['moderate_messages', 'moderate_images', 'warn_users', 'suspend_users', 'ban_users'],
  is_active = true;

-- Verify
SELECT id, display_name, scan_credits, is_grower, grower_farm_name FROM profiles
WHERE id IN ('2d3d5906-a5cc-4bca-a6de-c98586728dfa', '237fc1d6-3c5e-4a50-b01a-f71fcd825768');

SELECT user_id, permissions, is_active FROM moderators
WHERE user_id IN ('2d3d5906-a5cc-4bca-a6de-c98586728dfa', '237fc1d6-3c5e-4a50-b01a-f71fcd825768');
```

**Expected Result:**
```
Topher Cook | 999 credits | true | StrainSpotter HQ
Andrew Beck | 999 credits | true | StrainSpotter HQ
```

---

## 🚀 STEP 2: Vercel Deployment Setup

### Your Current Deployments:
- **Frontend**: https://strainspotter.vercel.app (or similar)
- **Backend**: https://backend-qp9e6f9oh-tophercook7-makers-projects.vercel.app

### A. Backend Environment Variables

Go to: **Vercel Dashboard → backend project → Settings → Environment Variables**

Add these (get values from `env/.env.local`):

```bash
# Get your values:
grep SUPABASE_URL env/.env.local
grep SUPABASE_ANON_KEY env/.env.local
grep SUPABASE_SERVICE_ROLE_KEY env/.env.local
cat env/google-vision-key.json
```

**Required Variables:**
1. `SUPABASE_URL` = Your Supabase project URL
2. `SUPABASE_ANON_KEY` = Your Supabase anon key
3. `SUPABASE_SERVICE_ROLE_KEY` = Your Supabase service role key
4. `GOOGLE_VISION_JSON` = Entire contents of `env/google-vision-key.json` (paste as one line)
5. `CORS_ALLOW_ORIGINS` = `https://strainspotter.vercel.app` (your frontend URL)

**Set for:** Production, Preview, Development

### B. Frontend Environment Variables

Go to: **Vercel Dashboard → frontend project → Settings → Environment Variables**

**Required Variables:**
1. `VITE_SUPABASE_URL` = Your Supabase project URL (same as backend)
2. `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key (same as backend)
3. `VITE_API_BASE` = `https://backend-qp9e6f9oh-tophercook7-makers-projects.vercel.app`

**Set for:** Production, Preview, Development

### C. Redeploy Both Projects

After setting environment variables:
1. Go to Vercel → Deployments
2. Click "..." on latest deployment → "Redeploy"
3. Do this for BOTH frontend and backend

---

## 🔍 STEP 3: Test Deployment

### Test Backend Health:
```bash
curl https://backend-qp9e6f9oh-tophercook7-makers-projects.vercel.app/health
```

**Expected:**
```json
{
  "ok": true,
  "supabaseConfigured": true,
  "googleVisionConfigured": true
}
```

### Test Seed Vendors:
```bash
curl "https://backend-qp9e6f9oh-tophercook7-makers-projects.vercel.app/api/seeds-live?strain=blue-dream"
```

### Test Dispensaries:
```bash
curl "https://backend-qp9e6f9oh-tophercook7-makers-projects.vercel.app/api/dispensaries-live?lat=37.7749&lng=-122.4194&radius=10"
```

---

## 🐛 STEP 4: Fix Known Issues

### Issue 1: Grower Profiles API Returns 404

**Problem:** `/api/grower-profiles` endpoint doesn't exist

**Fix:** The endpoint is actually `/api/grower-directory/profiles`

Check `backend/routes/grower-directory.js` is imported in `backend/index.js`

### Issue 2: Messages API Returns 400

**Problem:** Missing `user_id` parameter

**Fix:** Frontend needs to pass `user_id` when calling `/api/messages/conversations`

---

## 📱 STEP 5: Test Full App Flow

### 1. Login as Topher
- Email: `topher.cook7@gmail.com`
- Password: `KING123`

### 2. Check Profile
- Should show "Topher Cook"
- Should show 999 scan credits
- Should show "StrainSpotter HQ" farm name

### 3. Test Scan
- Upload a cannabis plant image
- Should process successfully
- Credits should decrease to 998

### 4. Test Seed Vendors
- Go to Seed Vendors page
- Search for a strain (e.g., "Blue Dream")
- Should show vendors (ILGM, Seedsman, etc.)

### 5. Test Dispensaries
- Go to Dispensaries page
- Allow location access
- Should show nearby dispensaries

### 6. Test Grower Directory
- Go to Grower Directory
- Should see Topher and Andrew listed
- Should be able to send messages

---

## 🔧 Diagnostic Scripts

Run these locally to check status:

```bash
# Check database setup
node backend/scripts/check-grower-setup.mjs

# Check scan system
node backend/scripts/test-scan-flow.mjs

# Full app diagnostic
node backend/scripts/full-app-diagnostic.mjs
```

---

## 📊 User Accounts Summary

| Email | Display Name | Scan Credits | Is Grower | Notes |
|-------|--------------|--------------|-----------|-------|
| topher.cook7@gmail.com | Topher Cook | 999 | ✅ | Admin/Owner/Moderator |
| andrewbeck209@gmail.com | Andrew Beck | 999 | ✅ | Admin/Owner/Moderator |
| christophercook73@hotmail.com | User | 0 | ❌ | Regular user |
| (5 others) | Green Grower | 20 | ❌ | Test accounts |

---

## 🚨 Common Issues & Fixes

### "Scan not working"
1. Check scan credits > 0
2. Check backend is deployed and healthy
3. Check `VITE_API_BASE` is set in Vercel
4. Check browser console for errors

### "Seed vendors not showing"
1. Check backend `/api/seeds-live` endpoint works
2. Check database has seed_vendors data
3. Check frontend is calling correct API

### "Dispensaries not showing"
1. Allow location access in browser
2. Check backend `/api/dispensaries-live` endpoint works
3. Check database has dispensaries data

### "Can't login"
1. Check Supabase auth is configured
2. Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel
3. Try password reset

---

## ✅ Final Checklist

- [ ] Run `SETUP_ADMINS.sql` in Supabase
- [ ] Set backend environment variables in Vercel
- [ ] Set frontend environment variables in Vercel
- [ ] Redeploy both frontend and backend
- [ ] Test backend health endpoint
- [ ] Login as Topher and verify 999 credits
- [ ] Test scan functionality
- [ ] Test seed vendors
- [ ] Test dispensaries
- [ ] Test grower directory

---

## 🆘 Need Help?

Run the diagnostic script and share the output:
```bash
node backend/scripts/full-app-diagnostic.mjs
```

This will show exactly what's working and what needs fixing.

