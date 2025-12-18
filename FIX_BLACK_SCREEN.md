# Fix Black Screen Issue

## Problem
- Black screen on Mac installer
- Blank page at strainspotter.com
- Need to use strainspotter.app domain

## Changes Made

1. **Updated Tauri Config** (`src-tauri/tauri.conf.json`):
   - Changed `frontendDist` from `https://strainspotter.com` to `https://strainspotter.app`

2. **Fixed Access Gate Redirect** (`components/DesktopAccessGate.tsx`):
   - Fixed redirect path from `/api/desktop/access-denied` to `/desktop-access-denied`

3. **Updated Remote Setup Script** (`scripts/setup-tauri-remote.sh`):
   - Default URL changed to `https://strainspotter.app`

## Next Steps

1. **Rebuild the installer:**
   ```bash
   npm run tauri:build:test
   ```

2. **Verify strainspotter.app is serving the app:**
   - Make sure Next.js app is deployed to strainspotter.app
   - Check that the app loads correctly in browser
   - Verify API routes work (especially `/api/desktop/check-access`)

3. **Check for CORS issues:**
   - Ensure strainspotter.app allows requests from Tauri app
   - Check browser console for errors

4. **Test the new installer:**
   - Install the rebuilt DMG
   - Launch app
   - Should load from strainspotter.app instead of strainspotter.com

## Potential Issues

1. **Domain not deployed:**
   - If strainspotter.app isn't serving the Next.js app, the desktop app will show a blank page
   - Deploy the app to strainspotter.app first

2. **CORS/Content Security Policy:**
   - Tauri app might be blocked by CSP
   - Check `src-tauri/tauri.conf.json` security CSP settings

3. **Access check failing:**
   - If `/api/desktop/check-access` fails, user might see blank page
   - Check browser console in Tauri app (View > Developer Tools)

## Debugging

To debug the black screen:

1. **Open Tauri DevTools:**
   - In the app, go to View > Developer Tools (or Cmd+Option+I)
   - Check console for errors
   - Check Network tab to see if requests are failing

2. **Check what URL is loading:**
   - In DevTools, check the URL bar or Network requests
   - Should be loading from `https://strainspotter.app`

3. **Test access endpoint:**
   - Try accessing `https://strainspotter.app/api/desktop/check-access` in browser
   - Should return JSON response

4. **Check if user is whitelisted:**
   - Make sure your user ID is in `desktop_whitelist` table
   - Or has `desktop_access: true` in profiles table
