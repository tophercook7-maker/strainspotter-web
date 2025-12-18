# 🛡️ Grower Directory & Messaging - Moderation Guide

## Overview
This guide outlines the moderation system, policies, and procedures for the StrainSpotter Grower Directory and Messaging features.

---

## 👮 Who Can Moderate?

### Moderator Roles
1. **Platform Owner (You)** - Full admin access
2. **Trusted Community Moderators** - Assigned by you
3. **Future: Paid Moderators** - If community grows

### Moderator Permissions
- `moderate_messages` - Review and remove inappropriate messages
- `moderate_images` - Approve/reject grower profile images
- `warn_users` - Issue warnings to users
- `suspend_users` - Temporary suspensions (requires higher permission)
- `ban_users` - Permanent bans (admin only)

---

## 📋 What Gets Moderated?

### 1. Profile Images
**Requirement:** Must be product/farm related (NOT personal photos)

✅ **Allowed:**
- Cannabis plants/flowers
- Growing facilities/greenhouses
- Farm logos/branding
- Product packaging
- Grow equipment

❌ **Not Allowed:**
- Personal selfies or portraits
- Unrelated images (cars, pets, landscapes)
- Inappropriate/offensive content
- Copyrighted images without permission

**Process:**
1. User uploads image
2. Image goes into moderation queue
3. Moderator approves or rejects
4. If rejected, user is notified and can upload new image

### 2. Messages
**Monitored for:**
- Spam or excessive messaging
- Harassment or threats
- Solicitation of illegal activities
- Sharing of personal info (discouraged but not banned)
- Scams or fraud attempts

**User Actions:**
- Users can flag messages as inappropriate
- Flagged messages go to moderation queue
- Moderators review and take action

### 3. Grower Profiles
**Reviewed for:**
- Minimum 3 years experience requirement
- Accurate license status
- Appropriate bio content
- Farm name (not personal name)

---

## ⚖️ Moderation Actions & Consequences

### 3-Strike System

#### **Strike 1: Warning**
- **Trigger:** First offense, minor violation
- **Action:** 
  - Warning message sent to user
  - Violation logged in moderation history
  - User can continue using platform
- **Examples:**
  - Uploaded personal photo instead of product
  - Sent slightly spammy message
  - Minor guideline violation

#### **Strike 2: Temporary Suspension**
- **Trigger:** Second offense or moderate violation
- **Action:**
  - Account suspended for 7-30 days
  - Cannot send messages during suspension
  - Cannot appear in directory during suspension
  - User notified with reason and duration
- **Examples:**
  - Repeated spam after warning
  - Harassment of another user
  - Multiple inappropriate images

#### **Strike 3: Permanent Ban**
- **Trigger:** Third offense or severe violation
- **Action:**
  - Account permanently banned
  - All messages deleted
  - Removed from directory
  - Cannot create new account with same email
- **Examples:**
  - Continued harassment after suspension
  - Threats or illegal activity
  - Scamming other users
  - Severe or repeated violations

### Immediate Ban (No Warnings)
**For severe violations:**
- Threats of violence
- Sharing illegal content
- Doxxing other users
- Coordinating illegal sales/delivery
- Impersonation or fraud

---

## 🔄 Appeal Process

### Users Can Appeal:
1. **Warnings** - Can explain or dispute
2. **Suspensions** - Can request early reinstatement
3. **Bans** - Can appeal for review (rarely overturned)

### Appeal Workflow:
```
User submits appeal
    ↓
Appeal goes to moderation queue
    ↓
Different moderator reviews (not original moderator)
    ↓
Decision: Approved / Denied
    ↓
User notified of outcome
```

### Appeal Timeframes:
- **Warnings:** Reviewed within 24 hours
- **Suspensions:** Reviewed within 48 hours
- **Bans:** Reviewed within 7 days

---

## 🚨 Rate Limiting (Anti-Spam)

### Message Limits:
- **25 new conversations per day** - Prevents mass messaging
- **100 total messages per day** - Prevents spam
- **Unlimited messages** in existing conversations

### What Happens When Limit Reached:
- User sees error: "Daily message limit reached. Try again tomorrow."
- No penalty or strike
- Resets at midnight UTC

### Moderator Override:
- Moderators can increase limits for trusted users
- Useful for active community members

---

## 🛠️ Moderator Dashboard Features

### Message Moderation Queue
```
┌─────────────────────────────────────────────────┐
│  🚩 Flagged Messages (3)                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  From: User123 → GreenThumb420                  │
│  Flagged by: GreenThumb420                      │
│  Reason: "Spam"                                 │
│  Message: "Hey check out my website..."         │
│  Date: 2 hours ago                              │
│                                                 │
│  [View Full Conversation]                       │
│  [Approve] [Remove Message] [Warn User]         │
│                                                 │
├─────────────────────────────────────────────────┤
│  ... more flagged messages ...                  │
└─────────────────────────────────────────────────┘
```

### Image Moderation Queue
```
┌─────────────────────────────────────────────────┐
│  🖼️ Pending Profile Images (5)                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  User: GreenThumb420                            │
│  Uploaded: 1 hour ago                           │
│                                                 │
│  [Image Preview]                                │
│  🌿 Cannabis plant in grow tent                 │
│                                                 │
│  [✅ Approve] [❌ Reject]                        │
│  Reject reason: [_________________]             │
│                                                 │
├─────────────────────────────────────────────────┤
│  ... more pending images ...                    │
└─────────────────────────────────────────────────┘
```

### User Moderation History
```
┌─────────────────────────────────────────────────┐
│  👤 User: GreenThumb420                         │
├─────────────────────────────────────────────────┤
│  Member since: Jan 2025                         │
│  Messages sent: 47                              │
│  Messages received: 52                          │
│  Flagged messages: 0                            │
│  Moderation actions: 1                          │
│                                                 │
│  ⚠️ Warning - Jan 15, 2025                      │
│  Reason: Uploaded personal photo                │
│  Moderator: Admin                               │
│  Status: Active                                 │
│                                                 │
│  [View Full History] [Issue Warning]            │
│  [Suspend Account] [Ban Account]                │
└─────────────────────────────────────────────────┘
```

---

## 📊 Moderation Metrics

### Track These KPIs:
- **Flagged messages per day**
- **Average moderation response time**
- **Appeals submitted vs approved**
- **Active warnings/suspensions/bans**
- **Most common violation types**
- **Moderator activity levels**

### Monthly Reports:
- Total moderation actions taken
- User behavior trends
- Policy effectiveness
- Recommendations for updates

---

## 🔒 Privacy & Legal Considerations

### Contact Info Warnings
When users add phone/address, show this warning:

```
⚠️ PRIVACY WARNING

You are about to add contact information to your profile.

RISKS:
• Your phone number and/or address will be visible to all members
• You may receive unwanted calls, texts, or visitors
• This information cannot be easily removed from screenshots
• We are not responsible for misuse of your contact information

RECOMMENDATIONS:
• Use in-app messaging instead (safer and private)
• Only share contact info with trusted members
• Consider using a Google Voice number instead of personal phone
• Never share your exact address publicly

☑️ I understand the risks and want to add contact information

[Cancel] [I Understand, Continue]
```

### Data Retention
- **Messages:** Kept for 90 days after deletion (for moderation review)
- **Moderation actions:** Kept permanently (audit trail)
- **Flagged content:** Kept for 1 year
- **User appeals:** Kept for 1 year

### GDPR/Privacy Compliance
- Users can request data export
- Users can request account deletion
- Deleted accounts remove all personal data
- Moderation logs anonymized after 1 year

---

## 🎯 Best Practices for Moderators

### DO:
✅ Review context before taking action  
✅ Be consistent with policies  
✅ Explain decisions clearly to users  
✅ Give warnings before suspensions when possible  
✅ Document all actions with clear reasons  
✅ Escalate unclear cases to admin  
✅ Treat all users fairly and respectfully  

### DON'T:
❌ Make decisions based on personal feelings  
❌ Share user information outside moderation team  
❌ Engage in arguments with users  
❌ Take action without reviewing full context  
❌ Ignore flagged content  
❌ Abuse moderator powers  
❌ Moderate content involving yourself (conflict of interest)  

---

## 🚀 Getting Started as a Moderator

### Initial Setup:
1. Admin assigns you as moderator in database
2. You receive moderator permissions
3. Access moderator dashboard from Garden
4. Review this guide and platform policies
5. Shadow experienced moderator for first week
6. Start with image moderation (easier)
7. Progress to message moderation

### Training Checklist:
- [ ] Read full moderation guide
- [ ] Understand 3-strike system
- [ ] Know how to use moderation dashboard
- [ ] Practice with test cases
- [ ] Understand appeal process
- [ ] Know when to escalate to admin
- [ ] Reviewed privacy policies

---

## 📞 Escalation & Support

### When to Escalate to Admin:
- Legal threats or concerns
- Coordinated harassment campaigns
- Suspected illegal activity
- Unclear policy violations
- User disputes moderator decision
- Technical issues with moderation tools

### Contact:
- **Admin:** [Your contact method]
- **Moderator Slack/Discord:** [If you set one up]
- **Emergency:** [For urgent legal/safety issues]

---

## 📝 Policy Updates

This guide will be updated as:
- New violation patterns emerge
- Community feedback is received
- Legal requirements change
- Platform features evolve

**Last Updated:** [Date]  
**Version:** 1.0  
**Next Review:** [Date]

---

## ✅ Quick Reference

### Violation Severity Guide

| Violation | Severity | Action |
|-----------|----------|--------|
| Personal photo instead of product | Minor | Warning |
| Spam message (first time) | Minor | Warning |
| Repeated spam after warning | Moderate | 7-day suspension |
| Harassment | Moderate | 14-day suspension |
| Threats | Severe | Immediate ban |
| Illegal activity | Severe | Immediate ban + report |
| Scamming | Severe | Immediate ban |
| Doxxing | Severe | Immediate ban |

### Message Rate Limits
- 25 new conversations/day
- 100 total messages/day
- Unlimited in existing conversations

### Appeal Timeframes
- Warnings: 24 hours
- Suspensions: 48 hours
- Bans: 7 days

---

**Questions?** Contact the admin or refer to the full platform guidelines.

