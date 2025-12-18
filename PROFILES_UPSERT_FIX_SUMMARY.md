# Profiles Upsert 42P10 Fix - Complete

## Problem
Profiles upsert was returning error 42P10 "no unique constraint matching ON CONFLICT" because:
- Code was using `onConflict: "id"` 
- Actual DB primary key is `user_id` (not `id`)
- Payload was using `id: user.id` instead of `user_id: user.id`

## Fixes Applied

### 1. Main Upsert Function
**File**: `lib/auth/onAuth.ts`
- Changed payload from `id: user.id` to `user_id: user.id`
- Removed `onConflict: "id"` option entirely
- PostgREST now defaults to PRIMARY KEY (user_id)
- Added `last_login` back to payload

### 2. Migration Updated
**File**: `migrations/2025_01_12_profiles.sql`
- Changed primary key from `id` to `user_id`
- Updated RLS policies to use `user_id` instead of `id`

### 3. All Profiles Queries Updated
Updated all `.eq('id', ...)` to `.eq('user_id', ...)` in:
- `lib/auth.ts` - getUser() profile query
- `app/api/_utils/membership.ts` - getProfile(), resetScansToDefaults(), updateProfile(), insert()
- `app/api/credits/check/route.ts` - profile select
- `app/api/credits/deduct/route.ts` - profile select and update
- `app/api/scan/doctor/check/route.ts` - profile select
- `app/api/scan/doctor/deduct/route.ts` - profile select and update
- `app/api/doctor/credits/route.ts` - profile select and update (GET and POST)
- `app/api/pro/strain-train/upload/route.ts` - profile select

## Canonical Upsert Code

```typescript
export async function upsertProfile(user: any) {
  if (!user) return;

  const { error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    email: user.email,
    last_login: new Date().toISOString(),
  });

  if (error) {
    console.error("[onAuth] Profile upsert failed (non-blocking):", error);
  }
}
```

## Verification Checklist

- ✅ No remaining `onConflict: "id"` or `onConflict: "email"` in profiles upsert
- ✅ No remaining payload key `id` for profiles writes
- ✅ All profiles queries use `user_id` instead of `id`
- ✅ Migration updated to match actual DB schema

## Testing Steps

1. Restart dev server
2. Clear localhost cookies/storage
3. Sign in
4. Confirm NO requests to `/profiles` contain `?on_conflict=id` (or email)
5. Confirm response is 200/201
6. Check browser console for `[onAuth] Profile upserted` message (no errors)

## Notes

- The migration file now matches the actual DB schema (`user_id` as PK)
- All queries have been updated to use `user_id` consistently
- Upsert no longer specifies `onConflict` - PostgREST uses PRIMARY KEY automatically
