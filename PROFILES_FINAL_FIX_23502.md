# Profiles 23502 Fix - Complete

## Problem
Profiles table has:
- `user_id` as PRIMARY KEY
- `id` column with NOT NULL constraint

Previous upsert only set `user_id`, causing:
- **23502**: null value in column "id"

## Fixes Applied

### 1. Main Upsert Function
**File**: `lib/auth/onAuth.ts`
- Now sets BOTH `id` and `user_id` to `user.id`
- Removed `onConflict` option (PostgREST defaults to PRIMARY KEY)
- Satisfies both constraints:
  - `id`: NOT NULL constraint
  - `user_id`: PRIMARY KEY constraint

### 2. Profile Creation (Membership Utils)
**File**: `app/api/_utils/membership.ts`
- Updated `getProfile()` insert to set BOTH `id` and `user_id`
- Ensures new profile creation also satisfies both constraints

## Final Canonical Code

```typescript
export async function upsertProfile(user: any) {
  if (!user) return;

  const payload = {
    id: user.id,        // satisfies NOT NULL constraint
    user_id: user.id,  // satisfies PRIMARY KEY
    email: user.email,
    last_login: new Date().toISOString(),
  };

  const { error } = await supabase.from("profiles").upsert(payload);

  if (error) {
    console.error("[onAuth] Profile upsert failed (non-blocking):", error);
  }
}
```

## Verification Checklist

- ✅ `lib/auth/onAuth.ts` - upsert sets both `id` and `user_id`
- ✅ `app/api/_utils/membership.ts` - insert sets both `id` and `user_id`
- ✅ No `onConflict` specified in any profiles writes
- ✅ All profiles queries use `user_id` for lookups

## Testing Steps

1. ✅ Dev server restarted
2. Clear cookies + localStorage for localhost
3. Sign in at `/auth/login`
4. **Expected Results:**
   - POST /profiles returns 201 or 200
   - No 400 errors
   - No 23502 errors
   - Login succeeds
   - Redirect to /garden works
   - Console shows `[onAuth] Profile upserted` (no errors)

## Notes

- Both `id` and `user_id` are set to the same value (`user.id`)
- This satisfies the NOT NULL constraint on `id` and the PRIMARY KEY on `user_id`
- PostgREST automatically uses PRIMARY KEY for conflict resolution when `onConflict` is not specified
