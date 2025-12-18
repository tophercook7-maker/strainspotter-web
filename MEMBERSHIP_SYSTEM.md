# Membership & Trial System

## Overview
StrainSpotter now includes a membership tracking system with a "Try Me" trial period before requiring paid membership.

## Features

### Try Me Trial (Free)
- **2 Free Scans**: Users can scan 2 cannabis images with AI identification
- **2 Free Searches**: Users can search the strain database 2 times
- **7-Day Duration**: Trial expires after 7 days
- **Session-Based**: Tracks by session ID (anonymous) or user ID (logged in)

### Paid Membership
- **Unlimited Scans**: No limits on image scanning
- **Full Database Access**: Browse all 35,000+ strains
- **Advanced Features**: Groups, grow logs, grower directory, etc.
- **Tier Options**: Full or Premium membership

## Database Schema

### Tables Created
1. **`memberships`** - Tracks paid club members
   - `user_id`, `email`, `full_name`, `phone`
   - `status` (pending, active, expired, cancelled)
   - `tier` (trial, full, premium)
   - `joined_at`, `expires_at`
   - `payment_amount`, `payment_method`, `payment_reference`

2. **`trial_usage`** - Tracks "Try Me" trial usage
   - `session_id` (for anonymous users)
   - `user_id` (for logged-in users)
   - `scan_count`, `search_count`
   - `trial_started_at`, `trial_expires_at`

3. **`membership_applications`** - Join requests from users
   - `email`, `full_name`, `phone`, `message`
   - `status` (pending, approved, rejected)
   - `payment_received`, `payment_amount`, `payment_reference`
   - `reviewed_by`, `reviewed_at`, `review_notes`

## API Endpoints

### User Endpoints
- `GET /api/membership/status` - Check trial/membership status
- `POST /api/membership/apply` - Submit membership application

### Admin Endpoints
- `GET /api/membership/applications` - List all applications
- `POST /api/membership/applications/:id/approve` - Approve and create membership
- `GET /api/membership/members` - List all members
- `POST /api/membership/members/:id/update` - Update member status

## Backend Integration

### Middleware Functions

#### `checkAccess(req, res, next)`
Checks if user has active membership or valid trial:
- Sets `req.membershipStatus` ('active', 'trial', 'trial_expired')
- Sets `req.trial` with trial usage data
- Sets `req.tier` for active members

#### `enforceTrialLimit(type)`
Enforces trial limits on scans/searches:
- `type`: 'scan' or 'search'
- Returns 403 if limit reached or trial expired
- Auto-increments usage count
- Sets `req.trialUsage.remaining`

### Usage Example
```javascript
// Protect scan endpoint with trial enforcement
app.post('/api/uploads', 
  checkAccess, 
  enforceTrialLimit('scan'), 
  async (req, res) => {
    // ... upload logic
  }
);

// Protect search endpoint
app.get('/api/strains/search',
  checkAccess,
  enforceTrialLimit('search'),
  async (req, res) => {
    // ... search logic
  }
);
```

## Frontend Components

### `MembershipJoin.jsx`
User-facing component for:
- Viewing trial status and remaining scans/searches
- Seeing membership benefits
- Submitting membership applications

### `MembershipAdmin.jsx`
Admin component for:
- Viewing all membership applications
- Approving applications and creating memberships
- Managing member list and statuses

## Workflow

### User Journey
1. **First Visit** → Auto-creates trial (2 scans, 2 searches, 7 days)
2. **Use Features** → Each scan/search decrements trial count
3. **Limit Reached** → "Join Club" prompt with benefits
4. **Apply** → Fill form (name, email, phone, message)
5. **Admin Review** → Admin approves, enters payment details
6. **Membership Activated** → User gets unlimited access

### Admin Workflow
1. **View Applications** → See pending membership requests
2. **Review Details** → Check applicant info and message
3. **Approve** → Enter payment amount, reference, tier, expiry
4. **Activate** → Membership created, user notified

## Configuration

### Trial Limits (in `backend/routes/membership.js`)
```javascript
const TRIAL_SCAN_LIMIT = 2;
const TRIAL_SEARCH_LIMIT = 2;
const TRIAL_DURATION_DAYS = 7;
```

### Session ID
Frontend generates a unique session ID stored in `localStorage`:
```javascript
localStorage.getItem('ss-session-id')
```

## Database Setup

Run this SQL in Supabase SQL Editor:
```bash
# File: backend/migrations/2025_10_21_membership_tracking.sql
```

The migration creates all necessary tables, indexes, RLS policies, and triggers.

## Testing

### Test Trial Flow
1. Open app in incognito/private window
2. Try scanning 2 images → should work
3. Try 3rd scan → should get "Trial limit reached" error
4. Check status: `GET /api/membership/status`

### Test Application Flow
1. Click "Join Club" → Fill form
2. Check admin panel: `/membership-admin`
3. Approve application with payment details
4. Check members list → should see new active member

## RLS Policies

- **Service role** has full access (backend uses service role key)
- **Users** can view own membership/trial
- **Anyone** can submit membership applications
- **Users** can view own applications

## Future Enhancements

- [ ] Email notifications for application approval
- [ ] Payment gateway integration (manual for now)
- [ ] Membership renewal reminders
- [ ] Tiered feature access (basic vs premium)
- [ ] Referral/invite codes
- [ ] Analytics dashboard for membership metrics
