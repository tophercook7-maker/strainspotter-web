# Membership & Scan System Setup Guide

## Overview

This system implements a 3-tier membership model with scan counters and monthly resets:

- **Free**: 25 regular scans/month, 0 doctor scans
- **Garden ($9.99/month)**: 100 regular scans/month, 20 doctor scans
- **Pro ($39.99/month)**: 300 regular scans/month, 50 doctor scans

## Step 1: Run Supabase Migration

1. Open your Supabase dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/001_membership_tables.sql`
4. Run the migration

This will create:
- `profiles` table (membership & scan tracking)
- `transactions` table (purchase history)
- RLS policies for security
- Auto-profile creation trigger

## Step 2: Verify Tables

After running the migration, verify the tables exist:

```sql
SELECT * FROM profiles LIMIT 1;
SELECT * FROM transactions LIMIT 1;
```

## Step 3: Test API Routes

### Check Membership
```bash
curl http://localhost:5173/api/membership/check
```

### Use a Scan
```bash
curl -X POST http://localhost:5173/api/scans/use \
  -H "Content-Type: application/json" \
  -d '{"type": "regular"}'
```

### Top Up Scans
```bash
curl -X POST http://localhost:5173/api/scans/topup \
  -H "Content-Type: application/json" \
  -d '{"type": "regular", "package": "regular-25"}'
```

### Upgrade Membership
```bash
curl -X POST http://localhost:5173/api/membership/upgrade \
  -H "Content-Type: application/json" \
  -d '{"tier": "garden"}'
```

## Step 4: Integrate Frontend

### Use the Hook

```tsx
import { useScans } from '@/lib/hooks/useScans';

function ScannerPage() {
  const { balances, deductScan, showUpgradeOrTopUpPrompts } = useScans();

  const handleScan = async () => {
    const result = await deductScan('regular');
    if (!result.success) {
      // Show upgrade/top-up modal
      const prompts = showUpgradeOrTopUpPrompts('regular');
      // Show appropriate modal
    }
  };
}
```

### Use the Modals

```tsx
import ScanTopUpModal from '@/components/membership/ScanTopUpModal';
import UpgradeToGardenModal from '@/components/membership/UpgradeToGardenModal';

const handleTopUp = async (packageName: string) => {
  const response = await fetch('/api/scans/topup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'regular', package: packageName }),
  });
  // Handle response
};
```

## Top-Up Packages

### Regular Scans
- `regular-10`: 10 scans for $2.99
- `regular-25`: 25 scans for $5.99
- `regular-50`: 50 scans for $9.99

### Doctor Scans
- `doctor-5`: 5 doctor scans for $4.99
- `doctor-10`: 10 doctor scans for $8.99
- `doctor-20`: 20 doctor scans for $14.99

### Combo Packages
- `combo-25-5`: 25 regular + 5 doctor for $9.99
- `combo-50-10`: 50 regular + 10 doctor for $17.99

## Monthly Reset Logic

Scans automatically reset to tier defaults every 30 days. The reset happens when:
1. User calls `/api/membership/check`
2. System detects `last_reset` is 30+ days old
3. Scans are reset to tier defaults
4. `last_reset` is updated to current time

## Membership Defaults

| Tier | Regular Scans | Doctor Scans |
|------|--------------|--------------|
| Free | 25 | 0 |
| Garden | 100 | 20 |
| Pro | 300 | 50 |

## Files Created

- `supabase/migrations/001_membership_tables.sql` - Database schema
- `app/api/_utils/membership.ts` - Membership utilities
- `app/api/membership/check/route.ts` - Check membership status
- `app/api/membership/upgrade/route.ts` - Upgrade membership
- `app/api/scans/use/route.ts` - Deduct scans
- `app/api/scans/topup/route.ts` - Purchase scan top-ups
- `lib/hooks/useScans.ts` - Frontend hook
- `components/membership/*.tsx` - Modal components

## Next Steps

1. ✅ Run SQL migration in Supabase
2. ✅ Test API routes
3. ⏳ Integrate `useScans()` hook in scanner pages
4. ⏳ Add payment processing (Stripe integration)
5. ⏳ Add email notifications for low scans
6. ⏳ Add admin dashboard for viewing transactions

