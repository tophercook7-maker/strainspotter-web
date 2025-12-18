# Phase 2 / Lane A: Community Intelligence (Production) - Complete

## ✅ Implementation Summary

### STEP 1: Data Collection (Server Side)
- ✅ Weekly cron job: `backend/cron/generateCommunitySummaries.js`
- ✅ Filters out: Medical content, Illegal activity, Emergency/safety topics
- ✅ Requires at least 3 substantive discussions
- ✅ Returns nothing if below threshold

### STEP 2: AI Summary Generation
- ✅ Uses LOCKED PROMPT SPEC (strict observational tone)
- ✅ Multi-layer validation (forbidden words, structure, advice patterns)
- ✅ Discards output if rules violated
- ✅ Stores in `community_group_summaries` table

### STEP 3: Group Page Display
- ✅ `WeeklySummaryCard` component (collapsible)
- ✅ Shows "This Week's Summary" if exists
- ✅ Renders NOTHING if no summary (no empty state)
- ✅ Default: collapsed

### STEP 4: Dashboard Integration
- ✅ `CommunityInsights` component on Garden Dashboard
- ✅ Max one line per group
- ✅ Links to group pages (not specific posts)
- ✅ Format: "Group Name: snippet..."

### STEP 5: "What You Missed"
- ✅ Tracks `last_seen_at` per user per group
- ✅ Shows up to 3 items: summaries, pinned posts, helpful replies
- ✅ Cleared after viewing
- ✅ No scrolling feeds, no notifications

### STEP 6: Silence Zones Enforcement
- ✅ Filters medical/illegal/emergency keywords
- ✅ Detects single-user dominance (>50% posts)
- ✅ Requires minimum 3 discussions
- ✅ AI returns empty if validation fails
- ✅ UI renders nothing (no explanation)

### STEP 7: User Controls
- ✅ Settings page: `/settings/community-intelligence`
- ✅ Global toggle (ON by default)
- ✅ Per-section toggles:
  - Weekly summaries
  - Pattern signals
  - What you missed
- ✅ Preferences stored in `profiles.intelligence_preferences` JSONB

### STEP 8: Kill Switch
- ✅ Environment flag: `COMMUNITY_INTELLIGENCE_ENABLED`
- ✅ When false:
  - No summaries generated
  - No intelligence UI rendered
  - No errors shown
- ✅ Checked in:
  - Cron job
  - All API routes
  - All components (via API responses)

## Database Schema

### New Tables
- `community_group_summaries` - Weekly summaries
- `community_user_seen` - User visit tracking
- `community_pattern_signals` - Cross-group patterns

### New Column
- `profiles.intelligence_preferences` - User preferences (JSONB)

## API Endpoints

- `GET /api/community/summaries` - Get summary for a group
- `GET /api/community/summaries/list` - Get summaries for user's groups
- `GET /api/community/what-you-missed` - Get missed items
- `GET /api/community/pattern-signals` - Get pattern signals
- `GET /api/community/intelligence-settings` - Get user preferences
- `POST /api/community/intelligence-settings` - Update preferences
- `POST /api/community/user-seen` - Track user visit

## Components

- `WeeklySummaryCard.tsx` - Group page summary (collapsible)
- `CommunityInsights.tsx` - Dashboard insights
- `WhatYouMissed.tsx` - Community home missed items
- `PatternSignals.tsx` - Pattern signals card

## Settings Page

- Route: `/settings/community-intelligence`
- Global toggle + per-section controls
- Saves to database

## Acceptance Check ✅

1. ✅ Intelligence appears quietly (never demands attention)
2. ✅ No new interaction paths added
3. ✅ Silence occurs instead of weak output
4. ✅ Dashboard gains insight without noise
5. ✅ Users can ignore Lane A completely with no penalty

## Next Steps

1. Run migration: `migrations/2025_01_19_intelligence_preferences.sql`
2. Set up weekly cron job (see `COMMUNITY_INTELLIGENCE_SETUP.md`)
3. Optionally set `COMMUNITY_INTELLIGENCE_ENABLED=false` to disable

**Lane A is production-ready!** 🎉
