# Community Intelligence Layer (Lane A) - Setup Guide

## Overview

The Intelligence Layer provides read-only, passive summaries of Community activity without adding interaction, noise, or moderation risk.

## Database Setup

Run the migration to create the necessary tables:

```bash
# In Supabase SQL Editor, run:
migrations/2025_01_19_community_intelligence.sql
```

This creates:
- `community_group_summaries` - Weekly summaries per group
- `community_user_seen` - Tracks when users last viewed groups
- `community_pattern_signals` - Cross-group pattern detection

## Weekly Summary Generation

### Manual Run

To generate summaries manually:

```bash
npm run generate-community-summaries
```

Or:

```bash
cd backend/cron
node generateCommunitySummaries.js
```

### Scheduled Run (Recommended)

#### Option 1: Local Cron Job

Set up a weekly cron job (e.g., every Monday at 2 AM):

```bash
# Add to crontab (crontab -e)
0 2 * * 1 cd /path/to/strainspotter-web && npm run generate-community-summaries
```

#### Option 2: Vercel Cron Jobs

If deployed on Vercel, add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/community-summaries",
    "schedule": "0 2 * * 1"
  }]
}
```

Then create `app/api/cron/community-summaries/route.ts` that calls the generator.

#### Option 3: GitHub Actions

Create `.github/workflows/community-summaries.yml`:

```yaml
name: Generate Community Summaries
on:
  schedule:
    - cron: '0 2 * * 1'  # Every Monday at 2 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run generate-community-summaries
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

#### Option 4: Supabase Edge Functions

Create a scheduled Edge Function that calls the generator logic.

### Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

Optional (for AI summaries):
- `OPENAI_API_KEY` - OpenAI API key for enhanced summaries

## Features

### 1. Weekly Group Summaries
- Generated automatically each week
- Observational tone only
- No medical advice or diagnoses
- Themes extracted from discussions

### 2. Community Insights (Dashboard)
- Shows up to 3 group summaries
- One-line preview per group
- Links to group pages

### 3. What You Missed (Community Home)
- New pinned posts
- New helpful replies
- New weekly summaries
- Cleared after viewing

### 4. Pattern Signals (Optional)
- Cross-group theme detection
- Confidence threshold: 0.6
- Dismissible cards
- Observational only

## Safety Rules

The system enforces:

1. **No Medical Advice**: Summaries never diagnose or recommend treatment
2. **No Predictions**: No outcome predictions or guarantees
3. **Observational Only**: Patterns and themes, not prescriptions
4. **Confidence Threshold**: Pattern signals only shown if confidence ≥ 0.6
5. **Anonymization**: No usernames or quotes in summaries

## API Endpoints

- `GET /api/community/summaries?category=X&group_id=Y` - Get summary for a group
- `GET /api/community/summaries/list` - Get summaries for user's groups
- `POST /api/community/user-seen` - Track user visit to group
- `GET /api/community/what-you-missed` - Get missed items
- `GET /api/community/pattern-signals` - Get active pattern signals

## UI Components

- `components/community/WeeklySummaryCard.tsx` - Collapsible summary on group pages
- `components/community/CommunityInsights.tsx` - Dashboard insights
- `components/community/WhatYouMissed.tsx` - Community home missed items
- `components/community/PatternSignals.tsx` - Pattern signals card

## Acceptance Criteria

✅ Summaries appear weekly (not real-time)  
✅ No new posting or interaction added  
✅ Dashboard gains insight without noise  
✅ Community feels calmer, not busier  
✅ Users can ignore Lane A completely with no penalty
