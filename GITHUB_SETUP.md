# GitHub Actions Setup Instructions

## Quick Setup (5 minutes)

### 1. Create GitHub Repository
1. Go to https://github.com/new
2. Name it: `strainspotter`
3. Make it **Private** (recommended for API keys)
4. **DON'T** initialize with README (we already have one)
5. Click "Create repository"

### 2. Add Secrets to GitHub
1. In your new repo, go to: **Settings** → **Secrets and variables** → **Actions**
2. Click "New repository secret" and add these two secrets:

   **Secret 1:**
   - Name: `SUPABASE_URL`
   - Value: (copy from your `env/.env.local` file)

   **Secret 2:**
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: (copy from your `env/.env.local` file)

### 3. Push Code to GitHub
Run these commands in your terminal:

```bash
# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/strainspotter.git

# Push code
git branch -M main
git push -u origin main
```

### 4. Enable GitHub Actions
1. Go to your repo on GitHub
2. Click the "Actions" tab
3. If prompted, click "I understand my workflows, go ahead and enable them"

### 5. Test the Workflow
1. In GitHub, go to **Actions** tab
2. Click "Strain Data Pipeline" on the left
3. Click "Run workflow" → "Run workflow" button
4. Watch it run! ✨

## Schedule
- The pipeline runs automatically every day at 4:00 PM UTC
- You can manually trigger it anytime from the Actions tab
- Your computer does NOT need to be on! 🎉

## Monitoring
- Check logs in the "Actions" tab
- Download artifacts (reports) after each run
- Get email notifications if it fails

## Costs
**FREE** - GitHub gives you 2,000 minutes per month for free!
