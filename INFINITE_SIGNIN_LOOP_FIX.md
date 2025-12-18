# Infinite Sign-In Loop Fix - Complete

## Problem
Email+password sign-in was triggering multiple times or causing infinite loops, likely due to:
- Multiple form submissions
- Auth state change listeners triggering redirects
- Race conditions between login handler and auth listeners

## Fixes Applied

### 1. Login Page - Hard Guard Against Multiple Submits
**File**: `app/auth/login/page.tsx`
- Added `if (loading) return;` guard at the start of `handleSignIn`
- Prevents multiple simultaneous sign-in attempts
- Button is already disabled while loading
- No `useEffect` triggers sign-in (only form submit)

### 2. Verified No Duplicate Redirects
**Checked**:
- `app/auth/login/page.tsx` - redirects to `/garden` after sign-in ✅
- `app/auth/signup/page.tsx` - redirects to `/garden` after signup ✅
- `app/auth/callback/page.tsx` - redirects to `/garden` on callback ✅
- `components/layout/ResponsiveShell.tsx` - **NO redirect**, only updates user state ✅
- `middleware.ts` - protects routes, doesn't redirect on sign-in ✅
- `app/garden/layout.tsx` - server-side check, redirects to login if no session ✅

### 3. Verified No Auto Sign-In
**Checked**:
- No `signInWithPassword` calls in `useEffect` ✅
- No automatic sign-in triggers ✅
- All sign-in calls are user-initiated (form submit) ✅

### 4. Auth State Listener Behavior
**File**: `components/layout/ResponsiveShell.tsx`
- `onAuthStateChange` listener **only updates user state**
- **Does NOT redirect** - this is correct behavior
- Login page handles its own redirect after sign-in

## Final Login Handler Pattern

```typescript
const handleSignIn = async (e: React.FormEvent) => {
  e.preventDefault();
  if (loading) return; // 🔒 hard guard against multiple submits
  setLoading(true);
  setError(null);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Upsert profile
    if (data.user) {
      await upsertProfile(data.user);
    }

    // Redirect to garden or redirect param
    const redirectTo = searchParams.get('redirect') || '/garden';
    router.replace(redirectTo);
  } catch (err: any) {
    setError(err.message || 'Failed to sign in');
    setLoading(false);
  }
};
```

## Verification Checklist

- ✅ Login page has hard guard (`if (loading) return`)
- ✅ Button disabled while loading
- ✅ No `useEffect` triggers sign-in
- ✅ No auth listener redirects from login page
- ✅ Only ONE redirect path (login handler)
- ✅ No automatic sign-in calls
- ✅ ResponsiveShell doesn't redirect (only updates state)

## Testing Steps

1. Stop dev server
2. Restart dev server
3. Clear cookies + localStorage for localhost
4. Load `/auth/login`
5. Click "Sign In" **ONCE**

**Expected Result:**
- Button shows "Signing in…"
- Then redirect to `/garden`
- No repeated requests
- No infinite loop
- Console shows no errors

## Notes

- The `ResponsiveShell` auth listener is safe - it only updates state, doesn't redirect
- Login page redirects happen **once** after successful sign-in
- Middleware and garden layout protect routes but don't interfere with sign-in flow
- Hard guard prevents multiple simultaneous sign-in attempts
