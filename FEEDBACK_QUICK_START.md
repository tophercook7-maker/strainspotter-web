# 🚀 Feedback System - Quick Start Guide

**Status:** ✅ COMPLETE - Ready to use!
**Authentication:** 🔐 **Login Required** - Users must be logged in to submit feedback

---

## ✅ What's Done

1. **Floating feedback button** added to:
   - ✅ Home page
   - ✅ Garden page  
   - ✅ ScanWizard page

2. **Backend .env template** created with SMTP placeholders

3. **Documentation** created:
   - ✅ `FEEDBACK_SETUP_GUIDE.md` - Complete setup instructions
   - ✅ `backend/scripts/view-feedback.sql` - SQL queries for Supabase
   - ✅ `backend/scripts/view-feedback.mjs` - Command-line feedback viewer

---

## 🎯 How to Check Feedback (3 Ways)

### Method 1: Supabase Dashboard (Recommended)

**Quick Steps:**
1. Go to: https://rdqpxixsbqcsyfewcmbz.supabase.co
2. Click **"SQL Editor"** → **"New Query"**
3. Paste this query:

```sql
SELECT 
  m.content,
  m.created_at,
  COALESCE(u.username, u.email, 'Anonymous') as user
FROM messages m
LEFT JOIN profiles u ON m.user_id = u.id
WHERE m.group_id = (SELECT id FROM groups WHERE name = 'Feedback')
ORDER BY m.created_at DESC;
```

4. Click **"Run"** (or press Cmd+Enter)
5. View all feedback submissions!

---

### Method 2: Command Line Script

**Quick Steps:**
```bash
# View all feedback
node backend/scripts/view-feedback.mjs

# View last 24 hours
node backend/scripts/view-feedback.mjs --recent

# Count total feedback
node backend/scripts/view-feedback.mjs --count
```

**Note:** Requires `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`

---

### Method 3: Backend Terminal Logs

**Quick Steps:**
1. Open the terminal running your backend
2. Look for lines starting with `[FEEDBACK]`
3. Each submission is logged in real-time

**Example:**
```
[FEEDBACK] User anonymous submitted: Love the new scanner feature!
```

---

## 📧 Enable Email Notifications (Optional)

**Quick Steps:**

1. **Get Gmail App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Generate password for "StrainSpotter"
   - Copy the 16-character code

2. **Edit `backend/.env`:**
   ```env
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-password
   EMAIL_FROM=your-email@gmail.com
   EMAIL_TO=strainspotter25feedback@gmail.com
   ```

3. **Restart backend:**
   ```bash
   pkill -f "node index.js"
   cd backend && npm start
   ```

4. **Test it:**
   - Submit feedback through the app
   - Check email: strainspotter25feedback@gmail.com

---

## 🧪 Test the Feedback Button

**Quick Steps:**

1. **Open app:** http://localhost:5176
2. **Log in** to your account (required for feedback)
3. **Look for green button** in bottom-right corner
4. **Click it** to open feedback modal
5. **Type:** "Testing feedback system!"
6. **Click Submit**
7. **Check Supabase** using Method 1 above

**Note:** If you're not logged in, the modal will show a message asking you to log in first.

---

## 📁 Files Created/Modified

### Created:
- ✅ `backend/.env` - SMTP configuration template
- ✅ `FEEDBACK_SETUP_GUIDE.md` - Complete documentation
- ✅ `FEEDBACK_QUICK_START.md` - This file
- ✅ `backend/scripts/view-feedback.sql` - SQL queries
- ✅ `backend/scripts/view-feedback.mjs` - CLI viewer

### Modified:
- ✅ `frontend/src/components/Home.jsx` - Added floating button
- ✅ `frontend/src/components/Garden.jsx` - Added floating button
- ✅ `frontend/src/components/ScanWizard.jsx` - Added floating button

---

## 🎨 Feedback Button Design

**Location:** Bottom-right corner (fixed position)  
**Color:** Green gradient (#7CB342 → #9CCC65)  
**Icon:** Feedback/comment icon  
**Hover:** Scales up, brighter gradient, larger shadow  
**Z-index:** 1000 (always on top)

---

## 🔍 Troubleshooting

### Button not visible?
```bash
# Clear browser cache
Cmd + Shift + R (Mac)
Ctrl + Shift + R (Windows)
```

### Feedback not saving?
```bash
# Check backend is running
curl http://localhost:5181/health

# Check backend logs
grep "\[FEEDBACK\]" backend/logs/server.log
```

### Can't view in Supabase?
```sql
-- Create Feedback group if missing
INSERT INTO groups (name, description, is_public)
VALUES ('Feedback', 'User feedback and suggestions', false)
ON CONFLICT (name) DO NOTHING;
```

---

## 📞 Quick Reference

| What | Where | How |
|------|-------|-----|
| **Submit Feedback** | App (bottom-right button) | Click green FAB → Type → Submit |
| **View in Supabase** | https://rdqpxixsbqcsyfewcmbz.supabase.co | SQL Editor → Run query |
| **View in Terminal** | Backend logs | Look for `[FEEDBACK]` |
| **View via CLI** | Command line | `node backend/scripts/view-feedback.mjs` |
| **Enable Email** | `backend/.env` | Add SMTP credentials → Restart |

---

## 🎉 Summary

**Everything is ready!** The feedback system is fully functional:

✅ **Floating button** on Home, Garden, and ScanWizard pages  
✅ **Feedback stored** in Supabase `messages` table  
✅ **Real-time logging** to backend console  
✅ **3 ways to check** feedback (Supabase, CLI, logs)  
✅ **Email ready** (just add SMTP credentials)  
✅ **Complete documentation** for future reference

**Next Steps:**
1. Test the feedback button (see "Test the Feedback Button" above)
2. Check feedback in Supabase (see "Method 1" above)
3. Optionally enable email notifications (see "Enable Email Notifications" above)

---

**Need more help?** See `FEEDBACK_SETUP_GUIDE.md` for detailed instructions.

**Happy collecting feedback! 🎊**

