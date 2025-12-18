# StrainSpotter Automation Guide

## Overview
This document covers the automation setup for health checks, RLS policy validation, and scan upload testing.

## 1. UI Integration (Dev Dashboard)

### Features
- **Total Strains**: Displays count from `backend/data/strain_library.json`
- **Daily New (scraped)**: Shows new strains from last scraper run (from `import_report.json`)
  - Green checkmark if scraper found new strains
  - "No new strains today" if count is 0
- **Health Check**: Real-time status of:
  - Supabase connection
  - Google Vision credentials
  - Storage bucket existence
  - RLS policy status (permissive/blocked)
- **Test Scan Upload**: Button to test image upload with RLS error detection
  - Uses a tiny 1x1 PNG for testing
  - Shows success message with scan ID and URL
  - Shows clear error if RLS is blocking (with migration instructions)

### Access
- Navigate to the **Dev** tab in the top navigation
- Click "Test Scan Upload" to verify RLS policies are working

## 2. Backend Health Check Endpoint

### Endpoint: `/api/health`
Returns:
```json
{
  "supabaseConfigured": true,
  "googleVisionConfigured": true,
  "bucketExists": true,
  "rlsPermissive": true
}
```

### What it checks:
- **supabaseConfigured**: Verifies Supabase connection and can query `scans` table
- **googleVisionConfigured**: Checks if Google Vision credentials file exists
- **bucketExists**: Verifies `scans` storage bucket is present
- **rlsPermissive**: Tests if RLS policies allow inserts (crucial for scan uploads)

### Usage:
```bash
curl http://localhost:5181/api/health
```

## 3. GitHub Actions: Nightly Health Check

### Workflow: `.github/workflows/health-check.yml`

**Triggers:**
- **Scheduled**: Every day at 3 AM UTC
- **Manual**: Via "Run workflow" button in GitHub Actions

**Steps:**
1. Install backend dependencies
2. Start backend server
3. Check `/health` and `/api/health` endpoints
4. POST a test scan image to `/api/uploads`
5. Verify response (detect RLS errors)
6. Report success or failure

**Required GitHub Secrets:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_VISION_JSON` (inline JSON string)

**Setup:**
1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Add the secrets listed above
3. The workflow will run automatically at 3 AM UTC daily
4. Check the Actions tab for results

## 4. RLS Policy Setup (One-time)

### Problem:
Scan uploads fail with "new row violates row-level security policy"

### Solution:
Run the migration SQL once in Supabase:

1. Open Supabase Dashboard → SQL Editor
2. Copy/paste contents of `backend/migrations/2025_create_full_schema.sql`
3. Click "Run"
4. Verify: Test scan upload in Dev Dashboard (should show green success)

### What it does:
- Enables RLS on all tables (`scans`, `grow_logs`, `groups`, etc.)
- Creates **permissive dev policies**: `USING (true)` allows all operations
- For production: Switch to owner-only policies: `USING (user_id = auth.uid())`

## 5. Data Pipeline Automation

### Existing Workflow: `.github/workflows/strain-pipeline.yml`
- Runs daily at 3 AM UTC
- Executes `tools/full_pipeline.mjs`:
  1. Scrape strain sources
  2. Normalize data
  3. Enhance with metadata
  4. Import to Supabase
  5. Generate `import_report.json`

### Monitoring:
- Check Dev Dashboard "Daily New" count
- Review `backend/data/import_report.json` for detailed stats

## 6. Troubleshooting

### RLS Error in Dev Dashboard
**Error:** "Upload failed: new row violates row-level security policy"  
**Fix:** Run `backend/migrations/2025_create_full_schema.sql` in Supabase SQL editor

### Health Check Shows rlsPermissive: false
**Cause:** RLS policies not applied or too restrictive  
**Fix:** Re-run migration SQL

### GitHub Actions Health Check Fails
**Cause:** Secrets not configured or backend not starting  
**Fix:** 
1. Verify all secrets are set in GitHub repo settings
2. Check Actions logs for specific error
3. Ensure `GOOGLE_VISION_JSON` is valid inline JSON string

### Scraper Shows 0 Daily New
**Cause:** No new strains found, or scraper hasn't run  
**Fix:** 
- Check `.github/workflows/strain-pipeline.yml` run history
- Manually trigger workflow via Actions tab
- Review `backend/data/import_report.json` for errors

## 7. Next Steps

- **Production RLS**: Switch policies to owner-only when auth is implemented
- **Notifications**: Add Slack/Discord webhooks to GitHub Actions for failures
- **Monitoring Dashboard**: Expand Dev Dashboard with more metrics (API response times, error rates)
- **Automated Tests**: Add Playwright/Cypress for full UI testing
