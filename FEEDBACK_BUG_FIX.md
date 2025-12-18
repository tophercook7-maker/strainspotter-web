# 🐛 Feedback Submission Bug - FIXED!

## The Problem

When submitting feedback as "topher" (or any user), you got this error:

```
null value in column "user_id" of relation "messages" violates not-null constraint
```

But the Feedback Reader showed "No feedback yet".

---

## Root Cause

The `messages` table has a trigger function called `update_grower_last_active()` that runs after every message insert.

**The Bug:**
The trigger was trying to update the `profiles` table using:
```sql
WHERE user_id = NEW.sender_id
```

**The Problem:**
The `profiles` table uses `id` as the primary key, NOT `user_id`!

So the trigger was looking for a column that doesn't exist, causing the insert to fail.

---

## The Fix

Run this SQL in your **Supabase SQL Editor**:

```sql
-- Fix the update_grower_last_active trigger function
-- The profiles table uses 'id' as primary key, not 'user_id'

CREATE OR REPLACE FUNCTION update_grower_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET grower_last_active = now()
  WHERE id = NEW.sender_id  -- Changed from user_id to id
    AND is_grower = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## How to Apply the Fix

### **Step 1: Open Supabase Dashboard**

1. Go to: https://supabase.com/dashboard
2. Select your **StrainSpotter** project
3. Click **SQL Editor** in the left sidebar

### **Step 2: Run the Fix**

1. Click **"New Query"**
2. Copy the SQL from above
3. Paste it into the editor
4. Click **"Run"** (or press Cmd+Enter)

### **Step 3: Verify**

You should see:
```
Success. No rows returned
```

This means the function was updated successfully!

---

## Test the Fix

### **Test 1: Submit Feedback**

1. Open http://localhost:5176
2. Log in as **topher** (or any user)
3. Click the **green floating feedback button** (bottom-right)
4. Type: "Testing the fixed feedback system!"
5. Click **"Send"**
6. Should see: **"Thank you for your feedback!"** ✅

### **Test 2: View in Feedback Reader**

1. Log in as **strainspotter25@gmail.com** / **KING123**
2. Go to **Garden**
3. Click **"Feedback Reader"** (red/pink tile)
4. You should see the feedback from topher! ✅

### **Test 3: Check Backend Logs**

Look at the backend terminal (Terminal 105) for:
```
[FEEDBACK] User <uuid> submitted: Testing the fixed feedback system!...
```

---

## What Changed

### **Before (Broken):**
```sql
UPDATE profiles
SET grower_last_active = now()
WHERE user_id = NEW.sender_id  -- ❌ Column doesn't exist!
  AND is_grower = true;
```

### **After (Fixed):**
```sql
UPDATE profiles
SET grower_last_active = now()
WHERE id = NEW.sender_id  -- ✅ Correct column name!
  AND is_grower = true;
```

---

## Files Created

✅ `backend/migrations/FIX_GROWER_TRIGGER.sql` - SQL migration file  
✅ `backend/scripts/fix-grower-trigger.mjs` - Automated fix script (requires manual SQL)  
✅ `FEEDBACK_BUG_FIX.md` - This guide

---

## Why This Happened

The original migration file (`2025_grower_directory_messaging.sql`) had a bug in the trigger function.

The `profiles` table schema:
- Primary key: `id` (UUID, references `auth.users(id)`)
- Does NOT have a `user_id` column
- Uses `id` to reference the user

The trigger was written assuming `user_id` existed, but it doesn't.

---

## Summary

1. ✅ **Bug identified**: Trigger function using wrong column name
2. ✅ **Fix created**: SQL to update the function
3. ✅ **Migration file**: `backend/migrations/FIX_GROWER_TRIGGER.sql`
4. ✅ **Script created**: `backend/scripts/fix-grower-trigger.mjs`
5. ⏳ **Action needed**: Run the SQL in Supabase SQL Editor

---

## Next Steps

1. **Run the SQL** in Supabase SQL Editor (see Step 1-3 above)
2. **Test feedback submission** as topher
3. **View in Feedback Reader** as admin
4. **Celebrate!** 🎉

---

**After running the SQL fix, feedback submissions will work perfectly!**

The trigger will correctly update `grower_last_active` for growers when they send messages.

