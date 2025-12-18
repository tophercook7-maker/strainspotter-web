# Login Troubleshooting Guide

## Your App URLs
- **Frontend:** http://localhost:5184
- **Backend:** http://localhost:5181 ✅ (Running)

## Quick Login Steps

### First Time? Create Account:
1. Go to http://localhost:5184
2. Click **"Login"** tile
3. Click **"Sign Up"** tab (not Sign In)
4. Enter:
   - Email: your@email.com
   - Password: (minimum 6 characters)
5. Click **"Create Account"**
6. You should see: "Account created! You can now sign in..."
7. Switch to **"Sign In"** tab
8. Enter same email/password
9. Click **"Sign In"**

### Already Have Account?
1. Click **"Sign In"** tab
2. Enter email/password
3. Click **"Sign In"**

### Forgot Password?
1. Enter your email
2. Click **"Forgot Password?"**
3. Check your email for reset link

## Common Issues

### ❌ "Auth not configured"
**Fix:** Frontend env variables missing
```bash
# Check file exists
cat /Users/christophercook/Projects/strainspotter/frontend/.env.local

# Should show:
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

### ❌ "Invalid login credentials"
- **Wrong password** - Use forgot password
- **Email not registered** - Sign up first
- **Typo in email** - Double check spelling

### ❌ "Email not confirmed"
- Check spam folder for confirmation email
- **For dev:** Supabase auto-confirms (check Supabase dashboard > Authentication > Email Templates)

### ❌ Button does nothing / no response
1. Open browser console (F12)
2. Click Sign In
3. Look for red errors
4. Copy error and share it

### ❌ "This app is restricted" message
- **Allowlist blocking you** (shouldn't happen on localhost)
- **Fix:** Code already allows localhost
- If you see this, your hostname detection is wrong

## Dev Bypass (Testing Only)

If login keeps failing, bypass it temporarily:

```javascript
// In browser console (F12)
localStorage.setItem('strainspotter_membership', 'pro');
// Refresh page
```

Now you can test features without logging in.

## Check What's Actually Wrong

### Step 1: Open Browser Console
- Press F12 or Cmd+Option+I
- Click "Console" tab

### Step 2: Try to Login
- Click Sign In button
- Watch console for errors

### Step 3: Share the Error
Common errors:
- ❌ "Failed to fetch" = Backend not running
- ❌ "Invalid login credentials" = Wrong email/password
- ❌ "Email not confirmed" = Check email
- ❌ "Auth session missing" = Need to sign up first

## Backend Check

Make sure backend is running:
```bash
curl http://localhost:5181/health
# Should return: {"ok":true,"supabaseConfigured":true,...}
```

## Supabase Dashboard Check

1. Go to https://app.supabase.com
2. Select your StrainSpotter project
3. Click **Authentication** > **Users**
4. See if your email is listed
5. If yes: try "Forgot Password"
6. If no: Sign up first

## Still Stuck?

Tell me:
1. What tab are you on? (Sign In or Sign Up)
2. What happens when you click the button?
3. Any error messages in browser console?
4. Can you create a test account with andrewbeck209+test@gmail.com ?

I'll help debug the specific issue!
