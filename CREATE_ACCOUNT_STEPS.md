# Create Your StrainSpotter Account

## "Invalid login credentials" = Need to Sign Up First!

### Step-by-Step:

1. **Go to:** http://localhost:5184
2. **Click:** "Login" tile on home page
3. **Look for tabs at top:** "Sign In" | "Sign Up"
4. **Click:** **"Sign Up"** tab (NOT Sign In!)
5. **Enter:**
   - Email: your@email.com
   - Password: (at least 6 characters)
6. **Click:** "Create Account"
7. **You'll see:** "Account created! You can now sign in..."
8. **Now switch to:** "Sign In" tab
9. **Enter same credentials**
10. **Click:** "Sign In"
11. ✅ **You're in!**

## Already Have Account but Forgot Password?

1. Stay on "Sign In" tab
2. Enter your email
3. Click "Forgot Password?" button
4. Check your email for reset link

## Test Account (For Quick Testing)

Want to test immediately? Use this temporary bypass:

1. Press F12 (open browser console)
2. Paste this:
```javascript
localStorage.setItem('strainspotter_membership', 'pro');
```
3. Press Enter
4. Refresh page (Cmd+R or Ctrl+R)
5. ✅ All features unlocked without login!

This bypasses login just for testing. Create real account for permanent access.

## Still Getting "Invalid Login Credentials"?

### Common Mistakes:
- ❌ Using "Sign In" when you meant "Sign Up"
- ❌ Typo in email address
- ❌ Wrong password (create new account or reset)
- ❌ Email from different signup session

### Check Supabase:
1. Go to: https://app.supabase.com
2. Select your StrainSpotter project
3. Click: Authentication → Users
4. Search for your email
5. If NOT there → Sign up!
6. If there → Try "Forgot Password"

## Your Backend is Running ✅
http://localhost:5181/health returns OK

## Your Frontend is Running ✅
http://localhost:5184 is live

**Just need to create account! Use Sign Up tab.**
