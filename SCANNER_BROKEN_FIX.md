# 🚨 CRITICAL FIX: Scanner Upload Failing

## The Real Error
```
POST http://localhost:5181/api/uploads 500 (Internal Server Error)
Could not find the 'user_id' column of 'trial_usage' in the schema cache
```

## Why It's Broken
The **scanner is blocked** because:
1. The upload endpoint has `enforceTrialLimit('scan')` middleware
2. This middleware checks the `trial_usage` table to enforce 10-scan trial limits
3. **The `trial_usage` table doesn't exist** (same membership system issue)
4. Without the table, ALL scans fail with 500 error

## Quick Fix (2 minutes) - Run the Membership SQL

**You MUST run the SQL from QUICK_FIX_MEMBERSHIP.md to fix the scanner!**

### Step 1: Open Supabase Dashboard
1. Go to: **https://app.supabase.com**
2. Select your **StrainSpotter** project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"**

### Step 2: Copy/Paste the SQL
Open `QUICK_FIX_MEMBERSHIP.md` and copy the entire SQL block (lines 18-88).

**Or run this shortened version that focuses on trial_usage:**

```sql
-- Trial Usage Table (REQUIRED FOR SCANNER)
CREATE TABLE IF NOT EXISTS trial_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  scan_count INTEGER DEFAULT 0,
  search_count INTEGER DEFAULT 0,
  trial_started_at TIMESTAMPTZ DEFAULT now(),
  trial_expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE trial_usage ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access to trial_usage" ON trial_usage
  FOR ALL USING (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_trial_usage_session ON trial_usage(session_id);
```

### Step 3: Click "Run"

### Step 4: Test Scanner
1. Open http://localhost:4173
2. Click **"Start Strain Scan"**
3. Upload an image
4. Should work now! ✅

## Alternative: Bypass Trial Limits (Dev Only)

If you want to skip the SQL setup during development, you can temporarily disable trial enforcement:

### Option A: Fake Pro Membership (Browser Console)
```javascript
localStorage.setItem('strainspotter_membership', 'pro');
// Refresh page
```

### Option B: Edit Backend (Quick Hack)
In `backend/index.js` line 196, remove `enforceTrialLimit('scan')`:

```javascript
// Before:
app.post('/api/uploads', checkAccess, enforceTrialLimit('scan'), writeLimiter, async (req, res, next) => {

// After:
app.post('/api/uploads', checkAccess, writeLimiter, async (req, res, next) => {
```

Then restart backend: `cd backend && npm run dev`

**⚠️ Warning:** This removes trial limits entirely. Not recommended for production.

## Why This Happened
The membership system (including trial tracking) was partially implemented but the database tables were never created. This affects:
- ✅ **Membership applications** - needs `membership_applications` table
- ✅ **Scanner uploads** - needs `trial_usage` table
- ✅ **Pro feature gating** - needs `memberships` table

All three tables are created by the SQL in `QUICK_FIX_MEMBERSHIP.md`.

## Verify It's Fixed
```bash
# After running SQL
curl -X POST http://localhost:5181/api/uploads \
  -H "Content-Type: application/json" \
  -H "x-session-id: test-session" \
  -d '{"filename":"test.jpg","contentType":"image/jpeg","base64":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="}'

# Should return:
{"id":"<uuid>","image_url":"https://..."}
```

---

**Next:** Run the membership SQL, then test scanner in app!
