# Quick Fix: Use Localhost for Desktop App Testing

## Problem
`strainspotter.app` has old code, causing black screen in desktop app.

## Solution: Build Desktop App to Use Localhost

### Step 1: Start Local Dev Server

```bash
npm run dev
```

Keep this running in a terminal. The app will be available at `http://localhost:3000`.

### Step 2: Build Desktop App with Localhost URL

```bash
DESKTOP_REMOTE_URL=http://localhost:3000 npm run tauri:build:test
```

This will:
- Update `tauri.conf.json` to use `http://localhost:3000`
- Build the desktop app
- Create installers that load from localhost

### Step 3: Test Desktop App

1. **Make sure dev server is running:**
   ```bash
   npm run dev
   ```

2. **Launch the desktop app:**
   - Open the built app from `src-tauri/target/release/bundle/macos/StrainSpotter.app`
   - Or install from the DMG

3. **Verify:**
   - App should load from `http://localhost:3000`
   - Should see latest code
   - No black screen

## For Production: Deploy Latest Code

Once you're ready to deploy:

1. **Deploy to strainspotter.app:**
   ```bash
   # Push to GitHub (if using Netlify auto-deploy)
   git add .
   git commit -m "Deploy latest code"
   git push origin main
   
   # Or manually deploy via Netlify dashboard
   ```

2. **Rebuild desktop app for production:**
   ```bash
   npm run tauri:build:test
   # (Uses https://strainspotter.app by default)
   ```

## Switching Between Localhost and Production

**For localhost testing:**
```bash
DESKTOP_REMOTE_URL=http://localhost:3000 npm run tauri:build:test
```

**For production:**
```bash
npm run tauri:build:test
# Uses https://strainspotter.app by default
```

**Or set explicitly:**
```bash
DESKTOP_REMOTE_URL=https://strainspotter.app npm run tauri:build:test
```
