# 🌱 Grower Directory + Messaging System - Implementation Plan

## Overview
Build a privacy-focused grower directory where members can:
- Opt-in to be listed as growers
- Specify license status (licensed/unlicensed)
- Share approximate location (city/state only - NO exact addresses or phone numbers)
- Connect with other growers through a secure, moderated messaging system
- Control who can contact them

---

## 🎯 Core Requirements

### Privacy & Safety First
✅ **Opt-in only** - Users must explicitly consent to be listed  
✅ **Approximate location** - City/State only, no exact addresses  
✅ **No phone numbers** - All communication through in-app messaging  
✅ **Block/report system** - Users can block unwanted contacts  
✅ **Message moderation** - Flagging system for inappropriate content  
✅ **Member-only** - Only active members can access directory and messaging  

### Grower Profile Features
- License status: Licensed / Unlicensed / Not Applicable
- Growing specialties: Indoor, Outdoor, Organic, Hydroponics, etc.
- Experience level (years growing)
- Bio/description
- Profile image (optional)
- City, State, Country (approximate location)
- Message preferences (accept messages: yes/no)

### Messaging Features
- Direct 1-on-1 messaging between members
- Group conversations (future enhancement)
- Read receipts
- Unread message counts
- Block users
- Flag/report inappropriate messages
- Message history
- Real-time updates (future: WebSocket/Supabase Realtime)

---

## 📊 Database Schema

See: `backend/migrations/2025_grower_directory_messaging.sql`

**New Tables:**
1. `conversations` - Stores all conversations
2. `conversation_participants` - Tracks who's in each conversation
3. `messages` - All messages with moderation support
4. `message_read_receipts` - Read tracking
5. `blocked_users` - Block list management

**Profile Extensions:**
- `is_grower` - Boolean flag
- `grower_license_status` - licensed/unlicensed/not_applicable
- `grower_listed_in_directory` - Opt-in consent
- `grower_directory_consent_date` - When they consented
- `grower_bio`, `grower_specialties`, `grower_experience_years`
- `grower_city`, `grower_state`, `grower_country`
- `grower_accepts_messages` - Message preferences

---

## 🏗️ Implementation Phases

### **Phase 1: Database Setup** ⏱️ 30 mins
- [x] Create migration file
- [ ] Run migration on Supabase
- [ ] Test RLS policies
- [ ] Verify indexes

### **Phase 2: Backend API Endpoints** ⏱️ 2-3 hours

#### Grower Directory Endpoints
```
POST   /api/grower-profile/setup          - Initial grower profile setup
PUT    /api/grower-profile/update         - Update grower profile
GET    /api/grower-profile/:userId        - Get specific grower profile
GET    /api/growers                       - List all growers (directory)
GET    /api/growers/search                - Search growers by location/specialty
POST   /api/grower-profile/opt-in         - Opt-in to directory
POST   /api/grower-profile/opt-out        - Opt-out of directory
```

#### Messaging Endpoints
```
POST   /api/conversations/create          - Create new conversation
GET    /api/conversations                 - List user's conversations
GET    /api/conversations/:id             - Get conversation details
GET    /api/conversations/:id/messages    - Get messages in conversation
POST   /api/conversations/:id/messages    - Send message
PUT    /api/messages/:id                  - Edit message
DELETE /api/messages/:id                  - Delete message
POST   /api/messages/:id/flag             - Flag message
POST   /api/messages/:id/read             - Mark as read
GET    /api/messages/unread-count         - Get unread counts
POST   /api/users/:id/block               - Block user
DELETE /api/users/:id/block               - Unblock user
GET    /api/users/blocked                 - Get blocked users list
```

### **Phase 3: Frontend Components** ⏱️ 4-5 hours

#### Grower Profile Setup Flow
```
components/GrowerProfileSetup.jsx
- Step 1: "Are you a grower?" (Yes/No)
- Step 2: License status (Licensed/Unlicensed)
- Step 3: Location (City, State - auto-detect with consent)
- Step 4: Profile details (Bio, specialties, experience)
- Step 5: Directory opt-in consent
- Step 6: Message preferences
```

#### Grower Directory Component
```
components/GrowerDirectory.jsx
- Search/filter by location, license status, specialties
- Grower cards with:
  - Profile image
  - Username
  - License badge (Licensed/Unlicensed)
  - Location (City, State)
  - Specialties tags
  - Experience level
  - "Message" button (if they accept messages)
- Privacy notice
- "Manage My Listing" button
```

#### Messaging Components
```
components/Messages/
  - MessagesList.jsx          - List of conversations
  - ConversationView.jsx      - Single conversation thread
  - MessageComposer.jsx       - Send message input
  - MessageBubble.jsx         - Individual message display
  - BlockedUsersList.jsx      - Manage blocked users
  - MessageNotifications.jsx  - Unread count badge
```

### **Phase 4: Integration & Testing** ⏱️ 2-3 hours
- [ ] Add "Grower Directory" tile to Garden
- [ ] Add "Messages" tile to Garden
- [ ] Add message notification badge to header
- [ ] Test grower signup flow
- [ ] Test messaging flow
- [ ] Test blocking/flagging
- [ ] Test privacy controls
- [ ] Mobile responsive testing

### **Phase 5: Moderation Dashboard** ⏱️ 2-3 hours
- [ ] Admin view for flagged messages
- [ ] Moderation actions (approve/remove/warn)
- [ ] User report history
- [ ] Ban/suspend users if needed

---

## 🔒 Privacy & Safety Features

### User Controls
✅ Opt-in/opt-out of directory at any time  
✅ Control message preferences  
✅ Block unwanted users  
✅ Flag inappropriate messages  
✅ Delete messages  
✅ Leave conversations  

### Platform Safeguards
✅ Member-only access (requires active membership)  
✅ No phone numbers or exact addresses  
✅ Message moderation system  
✅ Rate limiting on messages (prevent spam)  
✅ Audit trail for moderation  
✅ RLS policies prevent unauthorized access  

### Legal Compliance
✅ Clear consent for directory listing  
✅ Timestamp consent date  
✅ Easy opt-out process  
✅ Data deletion on account closure  
✅ Terms of service for messaging  

---

## 🎨 UI/UX Flow

### New User Onboarding
1. User signs up for membership
2. After payment, show "Complete Your Profile" prompt
3. Ask: "Are you a grower?" (Yes/No/Skip)
4. If Yes → Grower profile setup wizard
5. If No/Skip → Regular member profile

### Grower Profile Setup Wizard
```
┌─────────────────────────────────────┐
│  🌱 Grower Profile Setup            │
├─────────────────────────────────────┤
│                                     │
│  Step 1: Are you a grower?          │
│  ○ Yes, I grow cannabis             │
│  ○ No, I'm just a enthusiast        │
│                                     │
│  [Continue]                         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  📋 License Status                  │
├─────────────────────────────────────┤
│                                     │
│  Do you grow with a license?        │
│  ○ Licensed grower                  │
│  ○ Unlicensed (personal use)        │
│                                     │
│  [Continue]                         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  📍 Location (Approximate)          │
├─────────────────────────────────────┤
│                                     │
│  City: [San Francisco    ]          │
│  State: [California ▼]              │
│                                     │
│  ℹ️ We only show city/state         │
│     No exact addresses shared       │
│                                     │
│  [Continue]                         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ✍️ Tell Us About Your Growing      │
├─────────────────────────────────────┤
│                                     │
│  Bio: [I've been growing for...]    │
│                                     │
│  Specialties:                       │
│  ☑ Indoor  ☑ Organic                │
│  ☐ Outdoor ☐ Hydroponics            │
│                                     │
│  Experience: [5] years              │
│                                     │
│  [Continue]                         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🌍 Join Grower Directory?          │
├─────────────────────────────────────┤
│                                     │
│  ☑ List me in the Grower Directory  │
│                                     │
│  This allows other members to:      │
│  • See your profile                 │
│  • View your location (city/state)  │
│  • Send you messages                │
│                                     │
│  You can opt-out anytime.           │
│                                     │
│  ☑ Accept messages from members     │
│                                     │
│  [Complete Setup]                   │
└─────────────────────────────────────┘
```

### Grower Directory View
```
┌─────────────────────────────────────────────────┐
│  🌱 Grower Directory                            │
│  [← Back]                                       │
├─────────────────────────────────────────────────┤
│  Search: [____________]  🔍                     │
│                                                 │
│  Filter by:                                     │
│  Location: [All States ▼]                       │
│  License: [All ▼]  Specialty: [All ▼]          │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ 👤 GreenThumb420                          │ │
│  │ 📍 Denver, Colorado                       │ │
│  │ ✅ Licensed Grower                        │ │
│  │ 🌿 Indoor • Organic • 8 years exp         │ │
│  │                                           │ │
│  │ "Passionate about organic indoor grows"   │ │
│  │                                           │ │
│  │ [💬 Message]                              │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ 👤 CannabisCultivator                     │ │
│  │ 📍 Portland, Oregon                       │ │
│  │ 🔓 Unlicensed (Personal)                  │ │
│  │ 🌿 Outdoor • Hydroponics • 3 years exp    │ │
│  │                                           │ │
│  │ "Learning and sharing knowledge"          │ │
│  │                                           │ │
│  │ [💬 Message]                              │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Messages View
```
┌─────────────────────────────────────────────────┐
│  💬 Messages                          [3]       │
│  [← Back]                                       │
├─────────────────────────────────────────────────┤
│  Conversations:                                 │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ 👤 GreenThumb420                    [2]   │ │
│  │ "Thanks for the growing tips!"            │ │
│  │ 2 hours ago                               │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ 👤 CannabisCultivator                     │ │
│  │ "What nutrients do you use?"              │ │
│  │ Yesterday                                 │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Next Steps

**Option A: Build Everything Now** (8-10 hours total)
- Complete system ready to use
- Better user experience
- Single testing cycle

**Option B: Build in Stages**
- Stage 1: Grower profiles + directory (4-5 hours)
- Stage 2: Messaging system (4-5 hours)
- Downside: Directory less useful without messaging

**My Recommendation: Option A** - Build both together for best UX

---

## 📝 Questions to Confirm

1. ✅ Member-only access (requires active membership)?
2. ✅ No phone numbers, addresses, or external contact info?
3. ✅ Opt-in only for directory listing?
4. ✅ License status: Licensed vs Unlicensed (both allowed)?
5. ✅ Location: City/State only (no exact address)?
6. ✅ Messaging: In-app only with moderation?
7. ❓ Should we allow profile images for growers?
8. ❓ Should we show "last active" timestamp?
9. ❓ Should we have grower verification badges (for licensed)?
10. ❓ Should we limit messages per day (anti-spam)?

---

## 🎯 Ready to Start?

Say the word and I'll:
1. Run the database migration
2. Build the backend API endpoints
3. Create the frontend components
4. Integrate into the Garden
5. Test everything end-to-end

**Estimated time: 8-10 hours of focused work**

Let me know if you want to proceed! 🚀

