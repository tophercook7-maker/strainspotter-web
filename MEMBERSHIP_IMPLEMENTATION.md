# StrainSpotter Membership Implementation - Complete

## What's Implemented

### 1. Anonymous Trial System ✅
- **Edge Function**: `supabase/functions/try-me/index.ts` updated
  - Allows 2 free scans per device (no sign-in required)
  - Tracks usage by device ID or user ID
  - Club members get unlimited scans
  - Returns trial count in response

### 2. Frontend Components ✅
- **`frontend/src/lib/membership.js`**: Helper functions for membership status, Try Me scan, subscription verification
- **`frontend/src/hooks/useMembership.js`**: React hook for membership state management
- **`frontend/src/components/ScanCTA.jsx`**: Drop-in CTA component for scan entry
- **`frontend/src/components/MembershipSignup.jsx`**: Apple/Google Pay signup modal
- **`frontend/src/components/AuthGate.jsx`**: Optional auth wrapper (if you want sign-in later)
- **`frontend/src/hooks/useAuthRequired.js`**: Auth check hook

### 3. Database Migration ✅
- **`backend/migrations/004_try_me_usage.sql`**: SQL to create trial tracking table

### 4. Documentation ✅
- **`docs/membership-iap-guide.md`**: Complete integration guide with code examples
- **`docs/membership-setup.md`**: Apple/Google secrets setup guide

### 5. Edge Functions ✅
- **`try-me`**: Redeployed with anonymous trial logic
- **`verify-subscription`**: Scaffolded, ready for backend to finalize validation

---

## What You Need to Do Next

### Step 1: Database Setup
Run this SQL in Supabase SQL Editor:
```sql
-- Copy from backend/migrations/004_try_me_usage.sql
CREATE TABLE IF NOT EXISTS public.try_me_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_try_me_usage_identifier ON public.try_me_usage(identifier);
CREATE INDEX IF NOT EXISTS idx_try_me_usage_user_id ON public.try_me_usage(user_id);
```

### Step 2: Add Missing Supabase Secrets
Go to Supabase Dashboard → Project Settings → Functions → Secrets and add:

- **STRAIN_LIBRARY_URL**: Public URL to your `strain_library.json` file
  - Example: Host it in Supabase Storage (public bucket) or GitHub raw URL
  - Test URL works: `curl https://YOUR_URL/strain_library.json` should return JSON
- **GOOGLE_VISION_API_KEY**: Your Google Cloud Vision API key
  - Get from Google Cloud Console → APIs & Services → Credentials

After adding, redeploy:
```bash
supabase functions deploy try-me
supabase functions deploy verify-subscription
```

### Step 3: Configure App Store & Play Store Products
See `docs/membership-iap-guide.md` section 5B for detailed steps.

**Quick summary**:
- Product ID: `strainspotter_club_monthly`
- Price: $4.99/month
- Auto-renewable subscription

### Step 4: Install Capacitor IAP Plugin in Mobile App
```bash
cd StrainSpotter_Starter_Integrated_v5
npm install @capacitor-community/in-app-purchases
npx cap sync
```

### Step 5: Integrate Membership UI in Your App

**A. Add device ID tracking**:
```javascript
// In App.jsx or scan screen
import { Device } from '@capacitor/device';

const deviceInfo = await Device.getId();
const deviceId = deviceInfo.identifier;
```

**B. Wire MembershipSignup modal**:
```javascript
import MembershipSignup from './components/MembershipSignup';
import { tryMeScan } from './lib/membership';
import { supabase } from './config'; // You'll need to export supabase client from config.js

function ScanScreen() {
  const [showSignup, setShowSignup] = useState(false);
  
  async function handleScan(imageBase64) {
    const deviceId = await getDeviceId();
    try {
      const result = await tryMeScan({ imageBase64, supabase, deviceId });
      // Show scan results
    } catch (e) {
      if (e.code === 'TRIAL_LIMIT') {
        setShowSignup(true);
      } else {
        alert(e.message);
      }
    }
  }
  
  return (
    <>
      <button onClick={() => handleScan(image)}>Scan</button>
      {showSignup && (
        <MembershipSignup
          supabase={supabase}
          onSuccess={() => setShowSignup(false)}
          onCancel={() => setShowSignup(false)}
        />
      )}
    </>
  );
}
```

**C. Update MembershipSignup.jsx** with real IAP calls (see guide section 5C).

### Step 6: Tell Backend "Secrets Set"
Once you've added STRAIN_LIBRARY_URL and GOOGLE_VISION_API_KEY and redeployed, reply to your backend contact:

> "secrets set"

They'll finalize the `verify-subscription` function to:
- Validate Apple/Google receipts with your configured secrets
- Create user accounts on successful purchase
- Set `user_metadata.membership = 'club'`
- Return membership status

### Step 7: Test Everything
1. **Trial flow**: Open app anonymously → scan twice → see "Join Club" prompt
2. **Purchase flow**: Tap Apple/Google Pay → complete sandbox purchase → verify unlimited scans
3. **Member flow**: Scan multiple times without limit

---

## Quick Start Commands

```bash
# Deploy updated Edge Functions
supabase functions deploy try-me
supabase functions deploy verify-subscription

# Install IAP plugin (mobile app)
cd StrainSpotter_Starter_Integrated_v5
npm install @capacitor-community/in-app-purchases
npx cap sync
```

---

## Summary

✅ **What's done**:
- Anonymous trial system (2 free scans per device)
- Frontend membership helpers and components
- Apple/Google Pay signup UI
- Database migration SQL
- Integration guide

🔲 **What you need to do**:
1. Run SQL migration in Supabase
2. Add STRAIN_LIBRARY_URL and GOOGLE_VISION_API_KEY secrets
3. Configure App Store and Play Store subscription products
4. Install Capacitor IAP plugin in mobile app
5. Wire MembershipSignup modal into your scan UI
6. Update MembershipSignup with real IAP calls
7. Tell backend "secrets set"
8. Test trial and purchase flows

See `docs/membership-iap-guide.md` for detailed code examples and step-by-step instructions.
