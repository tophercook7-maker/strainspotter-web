# Direct Messages & Group Chat Fixes - Implementation Summary

**Date:** November 8, 2025  
**Status:** ✅ Complete

---

## 📋 Overview

Implemented a complete direct messaging system with unread notifications and fixed group chat last message display issues.

---

## 🗄️ Database Changes

### Created `direct_messages` Table

**File:** `backend/migrations/20251108_create_direct_messages.sql`

```sql
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  CONSTRAINT direct_messages_sender_receiver_check CHECK (sender_id != receiver_id)
);

CREATE INDEX idx_direct_messages_sender ON direct_messages(sender_id);
CREATE INDEX idx_direct_messages_receiver ON direct_messages(receiver_id);
CREATE INDEX idx_direct_messages_created_at ON direct_messages(created_at DESC);
```

**Note:** No foreign key constraints to avoid PostgREST schema cache issues.

---

## 🔧 Backend Changes

### 1. Direct Messages Route (`backend/routes/direct-messages.js`)

**New file** with three main endpoints:

#### GET `/api/direct-messages/:userId/:otherUserId`
- Load all messages between two users
- Fetches messages and user details separately (no foreign key syntax)
- Returns messages sorted by `created_at`

#### POST `/api/direct-messages`
- Send a new direct message
- Validates sender authentication via Bearer token
- Body: `{ sender_id, receiver_id, content }`

#### GET `/api/direct-chats/chats/:userId`
- Get list of all users the current user has chatted with
- Returns unique users with last message preview
- **Includes unread count** for each conversation
- Fetches messages and users separately to avoid schema cache issues

#### PUT `/api/direct-messages/mark-read/:userId/:otherUserId`
- Mark all messages from `otherUserId` to `userId` as read
- Sets `read_at` timestamp
- Called automatically when opening a chat

**Key Implementation Detail:**
```javascript
// Fetch messages without foreign key relationship
const { data: messages, error } = await supabaseAdmin
  .from('direct_messages')
  .select('*')
  .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
  .order('created_at', { ascending: false });

// Fetch users separately
const userIds = [...new Set(messages.map(m => [m.sender_id, m.receiver_id]).flat())];
const { data: users } = await supabaseAdmin
  .from('users')
  .select('id, username, avatar_url')
  .in('id', userIds);

// Manually join the data
const usersMap = new Map(users.map(u => [u.id, u]));
```

---

### 2. Groups Route Fix (`backend/routes/groups.js`)

**Problem:** Group buttons showing "No conversations yet" even after messages were sent.

**Root Cause:** Backend was using PostgREST foreign key syntax `users(id, username, avatar_url)` which failed due to schema cache issues, causing `last_message` to always be `null`.

**Solution:** Fetch messages and users separately, then manually join:

```javascript
// Fetch messages without foreign key relationship
const { data: lastMessages, error: lastErr } = await readClient
  .from('messages')
  .select('group_id, content, created_at, user_id')
  .in('group_id', groupIds)
  .order('created_at', { ascending: false });

// Fetch users separately
const userIds = [...new Set(lastMessages.map(m => m.user_id).filter(Boolean))];
const { data: users } = await readClient
  .from('users')
  .select('id, username, avatar_url')
  .in('id', userIds);

// Build last message map with user details
const usersMap = new Map(users.map(u => [u.id, u]));
for (const msg of lastMessages) {
  if (!lastMessageMap.has(msg.group_id)) {
    const user = usersMap.get(msg.user_id);
    lastMessageMap.set(msg.group_id, {
      content: msg.content,
      created_at: msg.created_at,
      user_id: msg.user_id,
      user: user ? { id: user.id, username: user.username, avatar_url: user.avatar_url } : null
    });
  }
}
```

---

## 🎨 Frontend Changes

### Groups Component (`frontend/src/components/Groups.jsx`)

#### 1. Added Direct Messages Tab with Notification Badge

```javascript
<Tab 
  icon={
    <Badge 
      badgeContent={directChats.reduce((sum, chat) => sum + (chat.unread_count || 0), 0)} 
      color="error"
      sx={{
        '& .MuiBadge-badge': {
          bgcolor: '#FF5252',
          color: '#fff',
          fontWeight: 700
        }
      }}
    >
      <ChatIcon />
    </Badge>
  } 
  label="Direct Messages" 
/>
```

#### 2. Recent Chats Section with Unread Badges

- Shows people you've messaged with last message preview
- Red badge on each user's avatar showing unread count
- Auto-refreshes after sending a message

```javascript
<Badge 
  badgeContent={chat.unread_count || 0} 
  color="error"
>
  <Avatar sx={{ bgcolor: 'rgba(124,179,66,0.5)' }}>
    {(chat.user.username || 'U').slice(0, 2).toUpperCase()}
  </Avatar>
</Badge>
```

#### 3. Auto Mark as Read

When opening a chat, messages are automatically marked as read:

```javascript
const startDirectChat = async (otherUser) => {
  setSelectedChat(otherUser);
  await loadDirectMessages(otherUser.user_id);
  
  // Mark messages from this user as read
  await fetch(`${API_BASE}/api/direct-messages/mark-read/${userId}/${otherUser.user_id}`, {
    method: 'PUT'
  });
  
  // Reload chats to update unread counts
  loadDirectChats();
};
```

#### 4. Groups List Auto-Refresh

Created `loadGroups()` function that's called after sending a message:

```javascript
const loadGroups = async () => {
  const res = await fetch(`${API_BASE}/api/groups`);
  if (res.ok) {
    const payload = await res.json();
    const curated = payload.filter(group => ALLOWED_GROUPS.includes(group.name));
    setGroups(curated);
  }
};

// Called after sending a message
if (res.ok) {
  // ... add message to UI
  loadGroups(); // Refresh groups list to update last_message
}
```

---

## 📁 Files Modified/Created

### Backend
- ✅ `backend/routes/direct-messages.js` (NEW)
- ✅ `backend/routes/groups.js` (MODIFIED)
- ✅ `backend/migrations/20251108_create_direct_messages.sql` (NEW)
- ✅ `backend/index.js` (MODIFIED - added direct-messages route)

### Frontend
- ✅ `frontend/src/components/Groups.jsx` (MODIFIED)

---

## 🧪 Testing

### Direct Messages
1. ✅ Send message to another user
2. ✅ Receive message from another user
3. ✅ Unread badge appears on Direct Messages tab
4. ✅ Unread badge appears on user's avatar in Recent Chats
5. ✅ Opening chat marks messages as read
6. ✅ Badges disappear when all messages are read

### Group Chats
1. ✅ Send message in a group
2. ✅ Close the chat dialog
3. ✅ Group button shows last message preview
4. ✅ Groups sorted by most recent activity

---

## 🚀 Deployment Notes

All files have been backed up to `/Users/christophercook/Projects/StrainSpotter` repository.

**To deploy:**
1. Commit changes to git
2. Push to GitHub
3. Backend auto-deploys to Render
4. Frontend auto-deploys to Vercel

**Database migration:**
Run the SQL in `backend/migrations/20251108_create_direct_messages.sql` in Supabase SQL editor (already done for local dev).

---

## 🎯 Key Learnings

1. **Avoid PostgREST Foreign Key Syntax** - When using Supabase client, avoid `users(id, username)` syntax as it relies on schema cache which can fail. Instead, fetch related data separately and join manually.

2. **Manual Joins Are Reliable** - Fetching data separately and joining in code is more reliable than relying on database relationships through PostgREST.

3. **Auto-Refresh After Mutations** - Always refresh related data after mutations (e.g., reload groups list after sending a message).

4. **Unread Tracking** - Use `read_at` timestamp field and count `WHERE read_at IS NULL` for unread counts.

---

## 📝 Next Steps (Optional)

- [ ] Add push notifications for new messages
- [ ] Add typing indicators
- [ ] Add message deletion
- [ ] Add image/file attachments
- [ ] Add message search
- [ ] Add block/report user functionality

---

**All changes tested and working! 🌿✨**

