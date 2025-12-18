# 🔐 Login Credentials

## Admin Account

**Email:** strainspotter25@gmail.com  
**Password:** KING123

**User ID:** 6401f241-238b-4ebd-9a34-bb4e5b7bdfa8

---

## How to Log In

1. Go to: http://localhost:5176
2. Click **"Sign In"** or **"Login"**
3. Enter:
   - **Email:** strainspotter25@gmail.com
   - **Password:** KING123
4. Click **"Sign In"**

---

## Features Available to Admin

Once logged in as admin, you'll have access to:

✅ **All regular features:**
- AI Strain Scanner
- Strain Browser
- Reviews Hub
- Community Groups
- Grow Coach
- Grower Directory
- Seed Vendors
- Dispensaries

✅ **Admin-only features:**
- **Feedback Reader** (red/pink tile in Garden)
  - View all user feedback submissions
  - See user profiles and timestamps
  - Refresh to see new feedback

---

## Troubleshooting

### "Invalid login credentials"
- Make sure you're using the exact email: `strainspotter25@gmail.com`
- Make sure password is exactly: `KING123` (all caps)
- Try clearing browser cache and cookies
- Try incognito/private browsing mode

### "Email not confirmed"
The account was created with `email_confirm: true`, so it should work immediately.

If you still have issues, run this script again:
```bash
node backend/scripts/reset-admin-password.mjs
```

---

## Password Reset

To change the password to something else, edit the script:

**File:** `backend/scripts/reset-admin-password.mjs`

**Line 29:** Change `KING123` to your desired password:
```javascript
const NEW_PASSWORD = 'YOUR_NEW_PASSWORD_HERE';
```

Then run:
```bash
node backend/scripts/reset-admin-password.mjs
```

---

## Security Notes

⚠️ **Important:**
- This password is stored in plain text in this file
- Don't commit this file to git
- Change the password in production
- Use a strong password for production deployments

**For production:**
1. Use Supabase Dashboard to reset password
2. Enable 2FA (two-factor authentication)
3. Use environment variables for admin credentials
4. Never hardcode passwords in scripts

---

## Next Steps

1. ✅ Log in with the credentials above
2. ✅ Go to Garden
3. ✅ Click "Feedback Reader" tile
4. ✅ Test the feedback system
5. ✅ Submit test feedback from another account
6. ✅ View it in the Feedback Reader

---

**Your account is ready!** 🎉

Go to http://localhost:5176 and log in with:
- Email: strainspotter25@gmail.com
- Password: KING123

