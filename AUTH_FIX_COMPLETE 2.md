# Supabase Auth Fix - Complete ✅

## Problem Fixed
**Browser Error**: "Failed to execute 'fetch' on 'Window': String contains non ISO-8859-1 code point"

**Root Cause**: Supabase persisted a corrupted auth token containing invisible Unicode characters. Browser crashes BEFORE fetch interceptors or sanitizers can run.

## Solution Applied

### ✅ STEP 1: Supabase Browser Client Fixed
**Files**: `lib/supabaseBrowser.ts`, `frontend/src/services/supabase.js`

**Configuration**:
```typescript
createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})
```

**Rules Enforced**:
- ✅ NO localStorage usage
- ✅ NO IndexedDB usage
- ✅ NO session rehydration
- ✅ Auth state managed ONLY in React state

### ✅ STEP 2: Fetch/Auth Sanitizers Removed
**Status**: No sanitizers found - none to remove
- ✅ No `lib/sanitizeFetch.ts`
- ✅ No `lib/debugFetch.ts`
- ✅ No `window.fetch` overrides
- ✅ No Authorization header interceptors

**Note**: `lib/api/safeFetch.ts` is a utility wrapper (timeout/retry), not a sanitizer.

### ✅ STEP 3: Server/Client Separation Verified
- ✅ Browser components use `getSupabaseBrowserClient()`
- ✅ Server components use `createSupabaseServer()`
- ✅ No shared singleton between environments
- ✅ Proper separation maintained

### ✅ STEP 4: Auth Flow Reset
**Login Page** (`app/auth/login/page.tsx`):
- ✅ Calls `supabase.auth.signOut({ scope: "local" })` before login
- ✅ Clears any corrupted in-memory session
- ✅ No automatic `getSession()` calls on app load
- ✅ Login only happens via explicit sign-in action

**No Auto-Restore**:
- ✅ All `getSession()` calls are commented out
- ✅ All `onAuthStateChange()` listeners are commented out
- ✅ Auth state managed in React only

### ✅ STEP 5: User Reset Instructions

After deploy, users need to clear corrupted storage ONCE:

**Option A (Preferred)**:
1. Open Chrome Incognito
2. Visit https://app.strainspotter.app
3. Login → should succeed

**Option B**:
1. Chrome DevTools → Application tab
2. Clear Site Data
3. Reload → Login

**Option C** (Manual):
1. Visit `/clear-auth` route
2. Automatically clears all Supabase storage
3. Redirects to login

## Expected Result

✅ Login works in browser  
✅ No ISO-8859-1 fetch errors  
✅ No sanitizer logs  
✅ No auth header crashes  
✅ Desktop app can be completed cleanly  
✅ Mobile app can reuse this auth logic safely  

## Important Notes

- ❌ DO NOT reintroduce sanitizers
- ❌ DO NOT enable `persistSession` later
- ❌ DO NOT regenerate anon keys
- ✅ This is a Supabase persistence issue, not fetch
- ✅ `/garden` worked because it never triggered client auth

## Files Modified

1. `lib/supabaseBrowser.ts` - Browser client config
2. `frontend/src/services/supabase.js` - Frontend client config
3. `app/auth/login/page.tsx` - Login flow with signOut before signIn
4. `components/AuthSessionReset.tsx` - Auto-clear on app load
5. `app/clear-auth/page.tsx` - Manual reset route

## Verification

All browser Supabase clients now have:
- `persistSession: false` ✅
- `autoRefreshToken: false` ✅
- `detectSessionInUrl: false` ✅

No fetch sanitizers or interceptors exist ✅

Auth state is managed in React only ✅

---

**Status**: COMPLETE - Ready for desktop app development

