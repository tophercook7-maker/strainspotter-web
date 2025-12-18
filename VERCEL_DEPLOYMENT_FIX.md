# Vercel Deployment Not Triggering - Fix Guide

## Issue
Pushes to GitHub are not triggering Vercel deployments.

## Possible Causes

1. **Vercel not connected to repository**
   - Vercel project may not be linked to the GitHub repo
   - Connection may have been broken

2. **Wrong repository name**
   - Repository moved from `strainspotter` to `StrainSpotter` (capital S)
   - Vercel may still be pointing to old name

3. **Branch mismatch**
   - Vercel may be watching a different branch (not `main`)

4. **Webhook issues**
   - GitHub webhook to Vercel may be missing or broken

## Manual Fix Steps

### Step 1: Verify Vercel Project Connection

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your project (likely named "strainspotter" or "StrainSpotter")
3. Click on the project
4. Go to **Settings** → **Git**
5. Check:
   - **Repository**: Should show `tophercook7-maker/StrainSpotter` or `tophercook7-maker/strainspotter`
   - **Production Branch**: Should be `main`
   - **Auto-deploy**: Should be enabled

### Step 2: Reconnect Repository (If Needed)

If repository shows as disconnected:

1. In Vercel project settings → **Git**
2. Click **Disconnect** (if connected to wrong repo)
3. Click **Connect Git Repository**
4. Select `tophercook7-maker/StrainSpotter` (or `strainspotter`)
5. Select `main` branch
6. Click **Deploy**

### Step 3: Manual Deployment Trigger

If auto-deploy is enabled but not working:

1. In Vercel Dashboard → Your Project
2. Click **Deployments** tab
3. Click **Create Deployment**
4. Select:
   - **Branch**: `main`
   - **Commit**: Latest commit (`9170cf5` or `c8d3ae6`)
5. Click **Deploy**

### Step 4: Verify GitHub Webhook

1. Go to GitHub → `tophercook7-maker/StrainSpotter` (or `strainspotter`)
2. Go to **Settings** → **Webhooks**
3. Look for Vercel webhook (should have `vercel.com` in URL)
4. If missing, Vercel will create it when you reconnect

## Current Repository Status

- **Repository**: `tophercook7-maker/StrainSpotter` (capital S)
- **Branch**: `main`
- **Latest Commit**: `9170cf5` - "Trigger Vercel deployment"
- **Previous Commit**: `c8d3ae6` - "Initial commit: Migrate strainspotter-web codebase"

## Quick Test

After reconnecting in Vercel, create another empty commit to test:

```bash
git commit --allow-empty -m "Test Vercel auto-deploy"
git push origin main
```

This should trigger a deployment if everything is connected correctly.
