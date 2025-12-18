# Community Intelligence Cron Job - Setup Confirmed ✅

## Cron Job Status

**Schedule:** Every Monday at 2:00 AM  
**Command:** `cd /Users/christophercook/Desktop/strainspotter-web && npm run generate-community-summaries`  
**Logs:** `/Users/christophercook/Desktop/strainspotter-web/logs/community-intelligence.log`

## How to Verify

```bash
# View your cron jobs
crontab -l

# Check logs after it runs
tail -f logs/community-intelligence.log

# Test manually anytime
npm run generate-community-summaries
```

## Cron Schedule Format

```
0 2 * * 1
│ │ │ │ │
│ │ │ │ └── Day of week (1 = Monday)
│ │ │ └──── Month (any)
│ │ └────── Day of month (any)
│ └──────── Hour (2 = 2 AM)
└────────── Minute (0)
```

## What Happens

Every Monday at 2 AM:
1. Cron job runs automatically
2. Generates summaries for all groups with activity
3. Filters out problematic content
4. Uses OpenAI for enhanced summaries (if available)
5. Stores results in database
6. Logs output to `logs/community-intelligence.log`

## Manual Testing

You can test the cron job anytime:

```bash
npm run generate-community-summaries
```

## Troubleshooting

**Cron not running?**
- Check cron service: `sudo service cron status` (Linux) or check macOS cron
- Verify cron job exists: `crontab -l`
- Check logs: `tail logs/community-intelligence.log`

**Want to change schedule?**
```bash
crontab -e
# Edit the line with generate-community-summaries
```

**Want to remove cron job?**
```bash
crontab -e
# Delete the line with generate-community-summaries
```

---

**Cron job is active and will run every Monday at 2 AM!** 🎉
