# Deploy Latest Code to strainspotter.app

## Problem
The desktop app is loading from `https://strainspotter.app` but that domain has old code. We need to deploy the latest code.

## Solution Options

### Option 1: Deploy to Netlify (Recommended)

If you're using Netlify for deployment:

1. **Push latest code to GitHub:**
   ```bash
   git add .
   git commit -m "Update desktop app configuration"
   git push origin main
   ```

2. **Trigger Netlify deployment:**
   - Netlify should auto-deploy on push
   - Or manually trigger in Netlify dashboard
   - Wait for build to complete

3. **Verify deployment:**
   - Visit `https://strainspotter.app` in browser
   - Should see latest code
   - Check that `/api/desktop/check-access` works

### Option 2: Use Localhost for Testing (Quick Fix)

For immediate testing, configure desktop app to use localhost:

1. **Start local dev server:**
   ```bash
   npm run dev
   ```

2. **Update Tauri config to use localhost:**
   ```bash
   # Temporarily change frontendDist to localhost
   # Edit src-tauri/tauri.conf.json
   # Change: "frontendDist": "https://strainspotter.app"
   # To: "frontendDist": "http://localhost:3000"
   ```

3. **Rebuild desktop app:**
   ```bash
   npm run tauri:build:test
   ```

4. **Test:**
   - Make sure `npm run dev` is running
   - Launch desktop app
   - Should load from localhost:3000

### Option 3: Use Environment Variable for URL

We can make the URL configurable:

1. **Set environment variable:**
   ```bash
   export DESKTOP_REMOTE_URL="http://localhost:3000"
   # Or for production:
   export DESKTOP_REMOTE_URL="https://strainspotter.app"
   ```

2. **Update build script to use env var**

## Quick Fix: Use Localhost Now

For immediate testing, let's configure the desktop app to use localhost:
