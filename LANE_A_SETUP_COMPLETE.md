# Lane A: Community Intelligence - Setup Complete ✅

## Status: Production Ready

All components are configured and ready to use.

## What's Been Set Up

### ✅ Database
- Migration run: `migrations/2025_01_19_community_intelligence.sql`
- Preferences migration run: `migrations/2025_01_19_intelligence_preferences.sql`
- All tables created and ready

### ✅ Environment Variables
- `COMMUNITY_INTELLIGENCE_ENABLED=true` (enabled by default)
- `OPENAI_API_KEY` (configured)
- `NEXT_PUBLIC_SUPABASE_URL` (configured)
- `SUPABASE_SERVICE_ROLE_KEY` (configured)

### ✅ Cron Job
- Script available: `npm run generate-community-summaries`
- API endpoint: `/api/cron/community-summaries`
- Setup script: `scripts/setup-community-intelligence-cron.sh`

### ✅ UI Components
- Weekly Summary Cards (group pages)
- Community Insights (Dashboard)
- What You Missed (Community Home)
- Pattern Signals (Dashboard)
- Settings Page (`/settings/community-intelligence`)

## How to Use

### Manual Summary Generation

```bash
npm run generate-community-summaries
```

### Set Up Weekly Cron Job

**Option 1: Use the setup script**
```bash
./scripts/setup-community-intelligence-cron.sh
```

**Option 2: Manual cron setup**
```bash
crontab -e
# Add this line:
0 2 * * 1 cd /path/to/strainspotter-web && npm run generate-community-summaries
```

**Option 3: Vercel Cron (if deployed)**
- Use the `/api/cron/community-summaries` endpoint
- Configure in Vercel dashboard

### User Settings

Users can control intelligence features at:
- `/settings/community-intelligence`

Options:
- Global toggle (ON by default)
- Weekly summaries toggle
- Pattern signals toggle
- What you missed toggle

### Disable Intelligence (Kill Switch)

To disable all intelligence features:

```bash
# In .env.local
COMMUNITY_INTELLIGENCE_ENABLED=false
```

This will:
- Stop summary generation
- Hide all intelligence UI
- Return empty responses from APIs

## Current Status

The system is working correctly:
- ✅ Content filtering active (medical/illegal/emergency)
- ✅ Silence zones enforced (single-user dominance, minimum discussions)
- ✅ Validation active (forbidden words, structure checks)
- ✅ All components respect kill switch and user preferences

## Next Steps

1. **Wait for community activity** - Summaries will generate when groups have ≥3 discussions
2. **Monitor logs** - Check `logs/community-intelligence.log` after cron runs
3. **Test manually** - Run `npm run generate-community-summaries` anytime
4. **User testing** - Visit group pages and dashboard to see intelligence features

## Troubleshooting

**No summaries appearing?**
- Check if groups have ≥3 discussions in the last 7 days
- Check for single-user dominance (one user >50% of posts)
- Verify `COMMUNITY_INTELLIGENCE_ENABLED=true`
- Check user preferences in settings

**Cron job not running?**
- Verify cron is installed: `crontab -l`
- Check logs: `tail -f logs/community-intelligence.log`
- Test manually: `npm run generate-community-summaries`

**Intelligence UI not showing?**
- Check user preferences at `/settings/community-intelligence`
- Verify `COMMUNITY_INTELLIGENCE_ENABLED` is not `false`
- Check browser console for errors

---

**Lane A is live and ready!** 🎉
