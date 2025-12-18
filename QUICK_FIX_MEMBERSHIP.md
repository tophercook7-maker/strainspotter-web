# Quick Fix: Enable Membership Applications

## The Problem
- Clicking "Submit Application" in the membership form does nothing
- Backend returns: "Could not find the table 'membership_applications'"
- The database tables for membership haven't been created yet

## The Solution (2 minutes)

### Step 1: Open Supabase Dashboard
1. Go to: **https://app.supabase.com**
2. Select your **StrainSpotter** project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"**

### Step 2: Run This SQL

Copy and paste this into the SQL editor:

```sql
-- Membership Applications Table
CREATE TABLE IF NOT EXISTS membership_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  payment_received BOOLEAN DEFAULT false,
  payment_amount DECIMAL(10,2),
  payment_reference TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Memberships Table
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  tier TEXT DEFAULT 'full' CHECK (tier IN ('trial', 'full', 'premium')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  payment_amount DECIMAL(10,2),
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trial Usage Table
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
ALTER TABLE membership_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_usage ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit applications
CREATE POLICY "Anyone can submit application" ON membership_applications
  FOR INSERT WITH CHECK (true);

-- Allow service role full access
CREATE POLICY "Service role full access to applications" ON membership_applications
  FOR ALL USING (true);

CREATE POLICY "Service role full access to memberships" ON memberships
  FOR ALL USING (true);

CREATE POLICY "Service role full access to trial_usage" ON trial_usage
  FOR ALL USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_membership_applications_status ON membership_applications(status);
CREATE INDEX IF NOT EXISTS idx_membership_applications_email ON membership_applications(email);
CREATE INDEX IF NOT EXISTS idx_memberships_email ON memberships(email);
CREATE INDEX IF NOT EXISTS idx_trial_usage_session ON trial_usage(session_id);
```

### Step 3: Click "Run"

### Step 4: Verify
After the SQL runs successfully, test the application form:

```bash
# In terminal
cd /Users/christophercook/Projects/strainspotter/backend
npm run setup:membership
```

You should see: **"✅ Tables already exist!"**

### Step 5: Test the Form
1. Open: http://localhost:4173
2. Click **"Membership"** tile
3. Fill out the form
4. Click **"Submit Application"**
5. You should see: **"Application submitted! We will review and contact you..."**

## Temporary Access (For Testing)

To test Pro features immediately without waiting for approval:

```javascript
// In browser console
localStorage.setItem('strainspotter_membership', 'pro');
// Refresh page
```

Now all Pro-gated features (Browse Strains, Groups, Growers) will be unlocked.

## What's Next

### View Applications (Admin)
- Go to: http://localhost:4173
- Navigate to `/membership-admin` in the URL
- See pending applications
- (Note: Approval workflow needs admin auth - can be added later)

### Complete Migration (Optional)
For the full system with all features, run the complete migration:
```
backend/migrations/2025_10_21_membership_tracking.sql
```

This adds:
- RLS policies for user access
- Triggers for updated_at timestamps
- Views for active members
- Comments and documentation

## Troubleshooting

**Still getting "table not found"?**
- Make sure you clicked "Run" in the SQL editor
- Check for any error messages in red
- Verify you're in the correct Supabase project

**Application still does nothing?**
- Check browser console (F12) for errors
- Verify backend is running: http://localhost:5181/health
- Check `SUPABASE_SERVICE_ROLE_KEY` in `env/.env.local`

**How do I approve applications?**
Currently manual via SQL:
```sql
-- Approve an application
UPDATE membership_applications
SET status = 'approved', reviewed_at = now()
WHERE email = 'user@example.com';

-- Create membership
INSERT INTO memberships (email, full_name, status, tier)
VALUES ('user@example.com', 'User Name', 'active', 'full');
```

Future: Add admin auth and approval UI in MembershipAdmin component.
