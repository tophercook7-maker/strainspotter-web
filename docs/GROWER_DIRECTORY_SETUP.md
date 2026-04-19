# 🌱 Grower Directory + Messaging System - Setup Guide

## Step 1: Run Database Migration

### Option A: Supabase SQL Editor (Recommended)

1. **Go to Supabase SQL Editor:**
   - Open: https://app.supabase.com/project/YOUR_PROJECT_ID/sql/new
   - Or navigate to: Dashboard → SQL Editor → New Query

2. **Copy the migration file:**
   - Open: `backend/migrations/2025_grower_directory_messaging.sql`
   - Copy the ENTIRE contents

3. **Paste and run:**
   - Paste into the SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter
   - Wait for "Success" message

4. **Verify tables were created:**
   Run this query to check:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN (
     'conversations',
     'conversation_participants',
     'messages',
     'message_read_receipts',
     'blocked_users',
     'user_moderation_actions',
     'message_rate_limits',
     'moderators'
   );
   ```
   
   You should see all 8 tables listed.

5. **Check profile columns were added:**
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'profiles' 
   AND column_name LIKE 'grower%';
   ```
   
   You should see columns like:
   - grower_listed_in_directory
   - grower_experience_years
   - grower_license_status
   - etc.

---

## Step 2: Make Yourself a Moderator (Optional)

If you want to moderate from day one, run this in SQL Editor:

```sql
-- Replace 'YOUR_USER_ID' with your actual user ID from auth.users
INSERT INTO moderators (user_id, permissions)
VALUES (
  'YOUR_USER_ID',
  ARRAY['moderate_messages', 'moderate_images', 'warn_users', 'suspend_users', 'ban_users']
);
```

To find your user ID:
```sql
SELECT id, email FROM auth.users WHERE email = 'your@email.com';
```

---

## Step 3: Test the Migration

Run these test queries to make sure everything works:

### Test 1: Check RLS policies
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('conversations', 'messages', 'moderators');
```

### Test 2: Check functions exist
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'create_direct_conversation',
  'get_unread_message_count',
  'can_send_message',
  'is_moderator'
);
```

### Test 3: Check indexes
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'profiles' 
AND indexname LIKE '%grower%';
```

---

## Step 4: Backend API Setup

Once the migration is complete, the backend API endpoints will be created automatically when you start the server.

The following endpoints will be available:

### Grower Profile Endpoints
- `POST /api/grower-profile/setup` - Initial setup
- `PUT /api/grower-profile/update` - Update profile
- `GET /api/grower-profile/:userId` - Get profile
- `POST /api/grower-profile/opt-in` - Opt into directory
- `POST /api/grower-profile/opt-out` - Opt out of directory

### Grower Directory Endpoints
- `GET /api/growers` - List all growers
- `GET /api/growers/search` - Search growers

### Messaging Endpoints
- `POST /api/conversations/create` - Create conversation
- `GET /api/conversations` - List conversations
- `GET /api/conversations/:id/messages` - Get messages
- `POST /api/conversations/:id/messages` - Send message
- `POST /api/messages/:id/flag` - Flag message
- `POST /api/messages/:id/read` - Mark as read

### Moderation Endpoints
- `GET /api/moderation/flagged-messages` - Get flagged messages
- `GET /api/moderation/pending-images` - Get pending images
- `POST /api/moderation/approve-image/:userId` - Approve image
- `POST /api/moderation/reject-image/:userId` - Reject image
- `POST /api/moderation/warn-user/:userId` - Warn user
- `POST /api/moderation/suspend-user/:userId` - Suspend user
- `POST /api/moderation/ban-user/:userId` - Ban user

### Blocking Endpoints
- `POST /api/users/:id/block` - Block user
- `DELETE /api/users/:id/block` - Unblock user
- `GET /api/users/blocked` - Get blocked users

---

## Step 5: Frontend Components

The following React components will be created:

1. **GrowerProfileSetup.jsx** - Onboarding wizard for growers
2. **GrowerDirectory.jsx** - Browse and search growers
3. **MessagingHub.jsx** - View all conversations
4. **ConversationView.jsx** - Individual conversation thread
5. **ModerationDashboard.jsx** - Moderator tools
6. **ContactInfoWarning.jsx** - Risk disclosure modal

---

## Troubleshooting

### Migration fails with "relation already exists"
This means some tables already exist. You can either:
1. Drop the existing tables and re-run (⚠️ DELETES DATA)
2. Run only the parts that failed

### RLS policies not working
Make sure you're using the correct Supabase client:
- Frontend: Use `supabase` (anon key) - respects RLS
- Backend: Use `supabaseAdmin` (service role) - bypasses RLS for admin operations

### Functions not found
Make sure the migration completed successfully. Check:
```sql
SELECT * FROM pg_proc WHERE proname LIKE '%grower%' OR proname LIKE '%message%';
```

---

## Next Steps

After migration is complete:
1. ✅ Backend API endpoints will be created
2. ✅ Frontend components will be built
3. ✅ Integration with Garden component
4. ✅ Testing and deployment

---

## Support

If you encounter issues:
1. Check the Supabase logs: Dashboard → Logs → Postgres Logs
2. Verify environment variables in `env/.env.local`
3. Make sure SUPABASE_SERVICE_ROLE_KEY is set
4. Check that you're using the correct project URL

---

**Ready to proceed?** Run the migration in Supabase SQL Editor and let me know when it's complete!

