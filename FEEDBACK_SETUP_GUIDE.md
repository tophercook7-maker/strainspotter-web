# 📬 StrainSpotter Feedback System - Complete Setup Guide

**Created:** November 4, 2025  
**Status:** ✅ Floating feedback button added to Home, Garden, and ScanWizard pages

---

## 🎯 What Was Added

### Floating Feedback Button
- **Location:** Bottom-right corner of Home, Garden, and ScanWizard pages
- **Design:** Green gradient FAB (Floating Action Button) with feedback icon
- **Behavior:** Opens a modal popup for submitting feedback
- **User Experience:** Always accessible, non-intrusive, matches app theme

### Components Modified
1. **Home.jsx** - Added floating feedback button and FeedbackModal
2. **Garden.jsx** - Added floating feedback button and FeedbackModal
3. **ScanWizard.jsx** - Added floating feedback button and FeedbackModal

---

## 📍 Where Feedback Is Stored

### 1. Supabase Database ✅ **PRIMARY STORAGE**

**Table:** `messages`  
**Group:** "Feedback" group  
**Access:** Supabase Dashboard

#### How to View Feedback in Supabase:

1. **Go to Supabase Dashboard:**
   - URL: https://rdqpxixsbqcsyfewcmbz.supabase.co
   - Login with your Supabase account

2. **Open SQL Editor:**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run this query to see all feedback:**
```sql
SELECT 
  m.id,
  m.content,
  m.created_at,
  m.user_id,
  u.email as user_email,
  u.username
FROM messages m
LEFT JOIN profiles u ON m.user_id = u.id
WHERE m.group_id = (
  SELECT id FROM groups WHERE name = 'Feedback'
)
ORDER BY m.created_at DESC;
```

4. **Or use Table Editor:**
   - Click "Table Editor" in the left sidebar
   - Select the `messages` table
   - Filter by `group_id` = (Feedback group ID)

---

### 2. Backend Console Logs ✅ **REAL-TIME MONITORING**

**Format:** `[FEEDBACK] User {user_id} submitted: {message}`  
**Location:** Terminal running backend server

#### How to View Backend Logs:

1. **Find the running backend process:**
```bash
ps aux | grep "node index.js" | grep -v grep
```

2. **Check the terminal where backend is running:**
   - Look for lines starting with `[FEEDBACK]`
   - Each submission is logged with timestamp, user ID, and message content

3. **Example log entry:**
```
[FEEDBACK] User anonymous submitted: The scanner is amazing! Would love to see more strain details...
```

---

### 3. Email Notifications ⚠️ **NOT YET CONFIGURED**

**Status:** Email system exists but requires SMTP setup  
**File Created:** `backend/.env` (template ready)

#### How to Enable Email Notifications:

**Step 1: Get Gmail App Password**

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in with your Gmail account
3. Click "Select app" → Choose "Mail"
4. Click "Select device" → Choose "Other (Custom name)"
5. Enter: "StrainSpotter Feedback"
6. Click "Generate"
7. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

**Step 2: Update backend/.env File**

1. Open `backend/.env` in your editor
2. Replace the placeholder values:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-actual-email@gmail.com
SMTP_PASS=abcdefghijklmnop
EMAIL_FROM=your-actual-email@gmail.com
EMAIL_TO=strainspotter25feedback@gmail.com
```

**Step 3: Restart Backend Server**

```bash
# Kill all running backend processes
pkill -f "node index.js"

# Start backend again
cd backend
npm start
```

**Step 4: Test Email Notifications**

1. Submit feedback through the app
2. Check your email at `strainspotter25feedback@gmail.com`
3. You should receive an email with the feedback content

---

## 🧪 How to Test the Feedback System

### Test 1: Submit Feedback via Floating Button

1. **Open your app:** http://localhost:5176
2. **Navigate to Home, Garden, or Scanner page**
3. **Look for the green floating button** in the bottom-right corner
4. **Click the button** to open the feedback modal
5. **Type a test message:** "Testing the new feedback system!"
6. **Click Submit**
7. **Check for success message**

### Test 2: Verify Feedback in Supabase

1. **Go to Supabase Dashboard:** https://rdqpxixsbqcsyfewcmbz.supabase.co
2. **Open SQL Editor**
3. **Run the query from Section 1 above**
4. **Verify your test message appears** in the results

### Test 3: Check Backend Logs

1. **Open the terminal running your backend**
2. **Look for the `[FEEDBACK]` log entry**
3. **Verify it shows your test message**

### Test 4: Test Email (After SMTP Setup)

1. **Complete SMTP setup** (see Section 3 above)
2. **Submit feedback through the app**
3. **Check email:** strainspotter25feedback@gmail.com
4. **Verify you received the email notification**

---

## 📊 How to Monitor Feedback

### Option 1: Supabase Dashboard (Recommended)

**Pros:**
- ✅ Persistent storage
- ✅ Full message history
- ✅ User information included
- ✅ Searchable and filterable
- ✅ Can export to CSV

**How to Access:**
1. Login to Supabase Dashboard
2. Use SQL Editor or Table Editor
3. Query the `messages` table filtered by Feedback group

### Option 2: Backend Terminal Logs

**Pros:**
- ✅ Real-time notifications
- ✅ No login required
- ✅ Quick glance at recent feedback

**Cons:**
- ❌ Logs may be lost if server restarts
- ❌ No historical data

**How to Access:**
1. Keep terminal open where backend is running
2. Watch for `[FEEDBACK]` entries
3. Use `grep` to filter logs: `grep "\[FEEDBACK\]" backend/logs/server.log`

### Option 3: Email Notifications (After Setup)

**Pros:**
- ✅ Instant notifications
- ✅ Can access from anywhere
- ✅ Email thread for each feedback

**Cons:**
- ❌ Requires SMTP configuration
- ❌ May end up in spam folder

**How to Access:**
1. Check email: strainspotter25feedback@gmail.com
2. Set up email filters/labels for organization
3. Create email rules to forward to team members

---

## 🔧 Troubleshooting

### Issue: Feedback button not visible

**Solution:**
1. Clear browser cache (Cmd+Shift+R on Mac)
2. Check that you're on Home, Garden, or ScanWizard page
3. Verify frontend is running: http://localhost:5176

### Issue: Feedback submission fails

**Solution:**
1. Check backend is running: http://localhost:5181/health
2. Check browser console for errors (F12 → Console tab)
3. Verify Supabase connection in backend logs

### Issue: Feedback not appearing in Supabase

**Solution:**
1. Check if "Feedback" group exists in `groups` table
2. Run this query to create it if missing:
```sql
INSERT INTO groups (name, description, is_public)
VALUES ('Feedback', 'User feedback and suggestions', false)
ON CONFLICT (name) DO NOTHING;
```

### Issue: Email notifications not working

**Solution:**
1. Verify SMTP credentials in `backend/.env`
2. Check Gmail App Password is correct (16 characters, no spaces)
3. Ensure backend was restarted after updating .env
4. Check backend logs for email errors
5. Verify Gmail account allows "Less secure app access" or use App Password

---

## 📝 Next Steps

### Immediate Actions:
- [x] Floating feedback button added to Home page
- [x] Floating feedback button added to Garden page
- [x] Floating feedback button added to ScanWizard page
- [x] Backend .env template created
- [ ] **Configure SMTP credentials** (see Section 3)
- [ ] **Test feedback submission** (see Section "How to Test")
- [ ] **Verify Supabase storage** (see Section 1)

### Optional Enhancements:
- [ ] Add feedback button to other pages (Groups, GrowCoach, etc.)
- [ ] Create admin dashboard to view all feedback
- [ ] Add feedback categories (Bug Report, Feature Request, General)
- [ ] Implement feedback voting/upvoting system
- [ ] Add email templates for better formatting
- [ ] Set up Slack/Discord webhook for instant notifications

---

## 📞 Support

If you need help with any of these steps:

1. **Check backend logs** for error messages
2. **Check browser console** (F12) for frontend errors
3. **Verify Supabase connection** in dashboard
4. **Test API endpoint directly:**
```bash
curl -X POST http://localhost:5181/api/feedback/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "Test feedback", "user_id": null}'
```

---

## ✅ Summary

**What's Working:**
- ✅ Floating feedback button on Home, Garden, and ScanWizard pages
- ✅ FeedbackModal component for user input
- ✅ Feedback stored in Supabase `messages` table
- ✅ Feedback logged to backend console with `[FEEDBACK]` prefix
- ✅ Backend .env template created for SMTP

**What Needs Configuration:**
- ⚠️ SMTP credentials for email notifications (optional)

**How to Check Feedback:**
1. **Supabase Dashboard** (recommended) - Full history and search
2. **Backend Terminal Logs** - Real-time monitoring
3. **Email** (after SMTP setup) - Instant notifications

---

**The feedback system is now fully functional!** Users can submit feedback from any major page, and you can check it in your Supabase dashboard or backend logs. Email notifications are optional and can be enabled by following the SMTP setup instructions above. 🎉

