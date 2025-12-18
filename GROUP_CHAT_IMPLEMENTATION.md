# Group Messaging & Chat Implementation Guide

## Overview
This document outlines the complete implementation plan for adding group messaging and real-time chat features to StrainSpotter. This will enable growers to connect, share knowledge, and build community.

---

## Phase 1: Database Schema & Backend Setup

### 1.1 Database Tables

Create the following tables in Supabase:

```sql
-- Groups table
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  is_public BOOLEAN DEFAULT true,
  is_official BOOLEAN DEFAULT false, -- StrainSpotter official groups
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Group members
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'owner', 'moderator', 'member'
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_at TIMESTAMPTZ DEFAULT now(), -- For unread message counts
  is_muted BOOLEAN DEFAULT false,
  UNIQUE(group_id, user_id)
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'image', 'strain_share', 'scan_share'
  metadata JSONB, -- For images, strain references, etc.
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Message reactions (optional, but nice)
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL, -- '👍', '❤️', '🔥', '🌿', etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- User presence/typing indicators
CREATE TABLE user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT false,
  is_typing BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Direct messages (1-on-1 chat, optional but recommended)
CREATE TABLE direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 Row-Level Security (RLS)

Enable RLS and create policies:

```sql
-- Groups: public groups visible to all, private groups only to members
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public groups are viewable by everyone" ON groups
  FOR SELECT USING (is_public = true);

CREATE POLICY "Private groups viewable by members only" ON groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
        AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create groups" ON groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group owners/moderators can update" ON groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
        AND group_members.user_id = auth.uid()
        AND group_members.role IN ('owner', 'moderator')
    )
  );

-- Group members: members can view other members in their groups
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group members" ON group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join public groups" ON group_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM groups WHERE groups.id = group_id AND groups.is_public = true)
  );

CREATE POLICY "Members can leave groups" ON group_members
  FOR DELETE USING (auth.uid() = user_id);

-- Messages: only group members can view/send messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = messages.group_id
        AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = messages.group_id
        AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can edit own messages" ON messages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE USING (auth.uid() = user_id);

-- Similar policies for reactions, presence, DMs...
```

### 1.3 Database Functions & Triggers

```sql
-- Function to update group updated_at timestamp when messages are sent
CREATE OR REPLACE FUNCTION update_group_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE groups SET updated_at = now() WHERE id = NEW.group_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_update_group_timestamp
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_group_timestamp();

-- Function to get unread message count for a user in a group
CREATE OR REPLACE FUNCTION get_unread_count(p_group_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM messages
  WHERE group_id = p_group_id
    AND created_at > (
      SELECT COALESCE(last_read_at, '1970-01-01'::timestamptz)
      FROM group_members
      WHERE group_id = p_group_id AND user_id = p_user_id
    );
$$ LANGUAGE sql;
```

### 1.4 Indexes for Performance

```sql
CREATE INDEX idx_messages_group_created ON messages(group_id, created_at DESC);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_messages_user ON messages(user_id);
```

---

## Phase 2: Backend API Routes

Create Express routes in `backend/routes/chat.js`:

### 2.1 Group Endpoints

```javascript
const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../supabaseClient');

// GET /api/chat/groups - List all public groups + user's private groups
router.get('/groups', async (req, res) => {
  const userId = req.user?.id; // Assumes auth middleware

  try {
    let query = supabase
      .from('groups')
      .select('*, group_members!inner(role, joined_at)')
      .order('updated_at', { ascending: false });

    if (userId) {
      // Include both public groups and user's private groups
      query = query.or(`is_public.eq.true,group_members.user_id.eq.${userId}`);
    } else {
      query = query.eq('is_public', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chat/groups - Create a new group
router.post('/groups', async (req, res) => {
  const { name, description, is_public } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Create group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({ name, description, is_public, created_by: userId })
      .select()
      .single();

    if (groupError) throw groupError;

    // Add creator as owner
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: userId, role: 'owner' });

    if (memberError) throw memberError;

    res.json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chat/groups/:id/join - Join a group
router.post('/groups/:id/join', async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data, error } = await supabase
      .from('group_members')
      .insert({ group_id: id, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/chat/groups/:id/leave - Leave a group
router.delete('/groups/:id/leave', async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### 2.2 Message Endpoints

```javascript
// GET /api/chat/groups/:id/messages - Get messages for a group (paginated)
router.get('/groups/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { limit = 50, before } = req.query; // Pagination: load messages before a timestamp

  try {
    let query = supabase
      .from('messages')
      .select('*, user:auth.users(email)')
      .eq('group_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(data.reverse()); // Return oldest to newest for chat display
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chat/groups/:id/messages - Send a message
router.post('/groups/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { content, message_type, metadata } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        group_id: id,
        user_id: userId,
        content,
        message_type: message_type || 'text',
        metadata
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/chat/messages/:id - Edit a message
router.put('/messages/:id', async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data, error } = await supabase
      .from('messages')
      .update({ content, is_edited: true, updated_at: new Date() })
      .eq('id', id)
      .eq('user_id', userId) // Only edit own messages
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/chat/messages/:id - Delete a message
router.delete('/messages/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true, content: '[Message deleted]' })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

Mount the router in `backend/index.js`:

```javascript
const chatRouter = require('./routes/chat');
app.use('/api/chat', chatRouter);
```

---

## Phase 3: Real-Time Setup with Supabase Realtime

### 3.1 Enable Realtime for Tables

In Supabase dashboard:
1. Go to Database > Replication
2. Enable replication for `messages`, `user_presence`, and `group_members` tables

### 3.2 Frontend Realtime Subscription

In your React components, subscribe to real-time updates:

```javascript
import { supabase } from '../supabaseClient';
import { useEffect, useState } from 'react';

function GroupChat({ groupId }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Subscribe to new messages in this group
    const subscription = supabase
      .channel(`group:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          console.log('New message:', payload.new);
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [groupId]);

  // ... rest of component
}
```

### 3.3 Typing Indicators

Update `user_presence` when user starts/stops typing:

```javascript
// When user starts typing
supabase
  .from('user_presence')
  .upsert({
    user_id: currentUserId,
    group_id: groupId,
    is_typing: true,
    updated_at: new Date()
  });

// When user stops typing (debounce this)
setTimeout(() => {
  supabase
    .from('user_presence')
    .upsert({
      user_id: currentUserId,
      group_id: groupId,
      is_typing: false,
      updated_at: new Date()
    });
}, 3000);
```

Subscribe to typing indicator changes:

```javascript
supabase
  .channel(`presence:${groupId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'user_presence',
      filter: `group_id=eq.${groupId}`
    },
    (payload) => {
      // Update UI to show who's typing
    }
  )
  .subscribe();
```

---

## Phase 4: Frontend Components

### 4.1 Component Structure

```
frontend/src/components/
├── GroupChat/
│   ├── GroupsList.jsx          # Browse and select groups
│   ├── GroupChatWindow.jsx     # Main chat interface
│   ├── MessageInput.jsx        # Compose and send messages
│   ├── MessageBubble.jsx       # Individual message display
│   ├── MemberList.jsx          # Group members sidebar
│   ├── TypingIndicator.jsx     # "User is typing..."
│   ├── CreateGroupModal.jsx    # Create new group
│   └── GroupSettings.jsx       # Manage group (for owners/mods)
```

### 4.2 GroupsList Component (Skeleton)

```jsx
import { useEffect, useState } from 'react';
import { Box, List, ListItem, ListItemText, Avatar, Badge, Button } from '@mui/material';
import { API_BASE } from '../config';

export default function GroupsList({ onSelectGroup }) {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/chat/groups`)
      .then(res => res.json())
      .then(data => setGroups(data));
  }, []);

  return (
    <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider' }}>
      <Button fullWidth variant="contained" onClick={() => { /* Open create modal */ }}>
        + New Group
      </Button>
      <List>
        {groups.map(group => (
          <ListItem button key={group.id} onClick={() => onSelectGroup(group)}>
            <Avatar src={group.avatar_url}>{group.name[0]}</Avatar>
            <ListItemText
              primary={group.name}
              secondary={group.description}
            />
            {/* Show unread badge here */}
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
```

### 4.3 GroupChatWindow Component (Skeleton)

```jsx
import { useEffect, useState, useRef } from 'react';
import { Box, Stack, Typography, IconButton } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { API_BASE } from '../config';
import { supabase } from '../supabaseClient';

export default function GroupChatWindow({ group, onBack }) {
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Load initial messages
    fetch(`${API_BASE}/api/chat/groups/${group.id}/messages`)
      .then(res => res.json())
      .then(data => setMessages(data));

    // Subscribe to new messages
    const subscription = supabase
      .channel(`group:${group.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${group.id}` },
        (payload) => setMessages(prev => [...prev, payload.new])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [group.id]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content) => {
    await fetch(`${API_BASE}/api/chat/groups/${group.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
        <IconButton onClick={onBack}><ArrowBack /></IconButton>
        <Typography variant="h6" sx={{ ml: 2 }}>{group.name}</Typography>
      </Box>

      {/* Messages area */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        <Stack spacing={1}>
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </Stack>
      </Box>

      {/* Input area */}
      <MessageInput onSend={handleSendMessage} />
    </Box>
  );
}
```

### 4.4 MessageInput Component (Skeleton)

```jsx
import { useState } from 'react';
import { Box, TextField, IconButton } from '@mui/material';
import { Send } from '@mui/icons-material';

export default function MessageInput({ onSend }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text);
      setText('');
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex' }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Type a message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        multiline
        maxRows={4}
      />
      <IconButton type="submit" color="primary" disabled={!text.trim()}>
        <Send />
      </IconButton>
    </Box>
  );
}
```

---

## Phase 5: Advanced Features (Optional Enhancements)

### 5.1 Image Sharing

- Add image upload to Supabase Storage
- Send message with `message_type: 'image'` and `metadata: { image_url }`
- Display images inline in `MessageBubble`

### 5.2 Strain/Scan Sharing

- Allow users to share strain profiles or scan results to chat
- `message_type: 'strain_share'` with `metadata: { strain_slug }`
- Render as rich card in chat

### 5.3 Moderation Tools

- Add report message functionality
- Moderator dashboard to review reports
- Ban/mute users at group level

### 5.4 Push Notifications

- Use Supabase Edge Functions or Firebase Cloud Messaging
- Send notifications when user receives DM or is mentioned

### 5.5 Read Receipts

- Update `group_members.last_read_at` when user views messages
- Display unread count on group list

---

## Phase 6: Testing & Deployment Checklist

- [ ] Create all database tables and RLS policies
- [ ] Test RLS: ensure users can't access messages from groups they're not in
- [ ] Implement backend API routes and test with Postman/curl
- [ ] Build frontend GroupsList component and test group browsing
- [ ] Build GroupChatWindow and test real-time message delivery
- [ ] Test typing indicators and presence
- [ ] Add authentication middleware to protect routes
- [ ] Test on mobile (responsive design)
- [ ] Performance test: simulate 100+ messages in a group
- [ ] Deploy backend to Vercel/production
- [ ] Update frontend API_BASE for production
- [ ] Monitor Supabase usage for Realtime quota

---

## Security Considerations

- **Rate limiting:** Limit messages per user per minute to prevent spam
- **Content moderation:** Scan messages for prohibited content (optional)
- **Encryption:** For private groups, consider end-to-end encryption (advanced)
- **Auth enforcement:** Always verify `auth.uid()` in RLS policies and API routes
- **Input validation:** Sanitize user input to prevent XSS/injection

---

## Cost Estimation (Supabase Free Tier Limits)

- **Database storage:** 500 MB (plenty for text messages; images in Storage)
- **Realtime connections:** 200 concurrent (enough for small-medium community)
- **API requests:** 500k/month (should be fine for chat)
- **Storage:** 1 GB free (for image uploads)

**Upgrade needed if:**
- You exceed 200 concurrent users in chat
- You have 100k+ messages and need more storage
- You want advanced features like video chat (separate service)

---

## Timeline Estimate

- **Phase 1 (Database):** 2-4 hours
- **Phase 2 (Backend API):** 4-6 hours
- **Phase 3 (Realtime):** 2-3 hours
- **Phase 4 (Frontend UI):** 8-12 hours
- **Phase 5 (Enhancements):** 6-10 hours (optional)
- **Testing & Deployment:** 4-6 hours

**Total:** ~26-41 hours for full implementation

---

## Next Steps

1. Run the SQL scripts in Supabase SQL Editor to create tables
2. Create `backend/routes/chat.js` and mount in `index.js`
3. Build `GroupsList` component and test group fetching
4. Build `GroupChatWindow` and integrate Realtime
5. Iterate and polish UI/UX
6. Deploy and invite beta testers

---

**Questions or need help?** Refer to:
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [React Chat UI Best Practices](https://react.dev)

Happy coding! 🌿💬
