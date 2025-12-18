# Email + Password Auth Overhaul - Complete

## Summary

The authentication system has been completely overhauled to use email + password authentication instead of magic links. All magic link references have been removed.

## Changes Made

### 1. Supabase Dashboard Configuration
- Documented in `AUTH_OVERHAUL_SUPABASE_SETUP.md`
- Email provider: ENABLED
- Magic link: NOT USED
- Site URL: `http://localhost:5173`

### 2. Auth UI - Login Form
- **Updated**: `app/login/page.tsx` - Now redirects to `/auth/login`
- **Created**: `app/auth/login/page.tsx` - Email + password form only
- Removed all magic link UI and references
- Clean email + password form with error handling

### 3. Sign In Function
- Uses `supabase.auth.signInWithPassword({ email, password })`
- Handles specific errors:
  - Invalid credentials
  - Email not confirmed
- Upserts profile on successful login
- Redirects to `/garden` on success

### 4. Sign Up Function
- **Created**: `app/auth/signup/page.tsx`
- Uses `supabase.auth.signUp({ email, password })`
- Password confirmation
- Minimum 6 characters
- Handles email confirmation (if enabled)
- Upserts profile on signup
- Redirects to `/garden` if no confirmation required

### 5. Auth Callback
- **Updated**: `app/auth/callback/page.tsx`
- No longer relies on magic link tokens
- Checks for existing session using `getSession()`
- Redirects to `/garden` if session exists
- Redirects to `/auth/login` if no session

### 6. Auth State Provider
- **Updated**: `lib/supabase.ts`
- Enabled session persistence: `persistSession: true`
- Auto-refresh tokens: `autoRefreshToken: true`
- Detect session in URL: `detectSessionInUrl: true`
- **Updated**: `components/layout/ResponsiveShell.tsx`
- Added auth state checking with `onAuthStateChange`
- Shows user email and logout button when logged in
- Shows "Sign in" link when logged out

### 7. Middleware - Garden Access
- **Created**: `middleware.ts`
- Allows public routes: `/`, `/scanner`, `/auth/login`, `/auth/signup`, `/auth/callback`
- Protects `/garden` routes - requires authentication
- Checks for session cookies
- Redirects to `/auth/login` if not authenticated

### 8. Garden Layout Protection
- **Created**: `app/garden/layout.tsx`
- Server-side protection using `getUser()`
- Redirects to login if no user
- Preserves redirect URL in query param

### 9. Header / Nav Visual Confirmation
- **Updated**: `components/layout/ResponsiveShell.tsx`
- Shows user email when logged in
- Shows "Log out" button
- Shows "Sign in" link when logged out
- Adds "Garden" link to nav when logged in

### 10. Removed Magic Link UX
- Removed all `signInWithOtp` calls
- Removed "magic link" text
- Removed `emailRedirectTo` usage
- Removed OTP-only flows
- All references to magic links removed

### 11. Profiles Upsert
- Already implemented in `lib/auth/onAuth.ts`
- Called on both sign-in and sign-up
- Updates `last_login` timestamp
- Persists email for contact/marketing

## Routes

- `/auth/login` - Email + password login
- `/auth/signup` - Email + password signup
- `/auth/callback` - Auth callback (session check)
- `/login` - Redirects to `/auth/login` (backward compatibility)

## Testing Checklist

After changes:
1. ✅ Restart dev server
2. ✅ Clear cookies/localStorage
3. ✅ Test sign up
4. ✅ Test log out
5. ✅ Test log in
6. ✅ Test access to `/garden`

## Expected Result

- Login works first try
- Session persists across page refreshes
- Garden loads for authenticated users
- Garden redirects to login for unauthenticated users
- Header shows correct login state

## Notes

- Email confirmation is optional (can be enabled/disabled in Supabase)
- Session persistence is handled automatically by Supabase client
- All auth state is managed client-side with server-side validation
- Middleware provides first-line protection for garden routes
