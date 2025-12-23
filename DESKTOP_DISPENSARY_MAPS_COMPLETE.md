# Desktop Wrapper + Dispensary Click → Google Maps — COMPLETE

## Overview

Created minimal Electron desktop wrapper and updated Dispensary Finder to open Google Maps in the default browser when clicking a dispensary.

## Part 1: Dispensary Finder Click Behavior ✅

**File**: `app/garden/dispensaries/page.tsx`

**Implementation**:
1. ✅ **Google Maps URL Construction**: Uses name + address for best results
   ```javascript
   const query = `${dispensary.name} ${dispensary.address}`;
   const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
   ```

2. ✅ **Safe Encoding**: Uses `encodeURIComponent()` for query string

3. ✅ **Click Behavior**: 
   - Entire card is clickable
   - Explicit "Open in Google Maps" button
   - Keyboard accessible (Enter/Space)
   - Uses `window.open(url, '_blank', 'noopener,noreferrer')`

4. ✅ **UI**: 
   - Card has `cursor-pointer` and hover effects
   - Button text: "Open in Google Maps"
   - Works on both web and desktop

**Rules**:
- ✅ Does NOT show phone number in-app
- ✅ Does NOT store phone numbers
- ✅ Lets Google handle all business details

## Part 2: Electron Desktop Wrapper ✅

**Folder**: `/desktop`

**Files Created**:
- `main.js` - Electron main process
- `preload.js` - Preload script (security bridge)
- `package.json` - Desktop app dependencies
- `README.md` - Documentation
- `.gitignore` - Build artifacts

**Main Process Requirements**:
- ✅ Loads URL from `process.env.STRAINSPOTTER_URL`
- ✅ Default window size: 1200x800
- ✅ `contextIsolation: true`
- ✅ `nodeIntegration: false`
- ✅ `enableRemoteModule: false`
- ✅ `sandbox: true`

**External Link Handling (Critical)** ✅:

The Electron wrapper intercepts and handles external links in three ways:

1. **`setWindowOpenHandler`**: Handles `window.open()` calls
   ```javascript
   mainWindow.webContents.setWindowOpenHandler(({ url }) => {
     shell.openExternal(url);
     return { action: 'deny' };
   });
   ```

2. **`new-window` event**: Handles new window creation attempts
   ```javascript
   contents.on('new-window', (event, navigationUrl) => {
     event.preventDefault();
     shell.openExternal(navigationUrl);
   });
   ```

3. **`will-navigate` event**: Handles direct navigation to external URLs
   ```javascript
   contents.on('will-navigate', (event, navigationUrl) => {
     const parsedUrl = new URL(navigationUrl);
     const appUrl = new URL(getAppUrl());
     if (parsedUrl.origin !== appUrl.origin) {
       event.preventDefault();
       shell.openExternal(navigationUrl);
     }
   });
   ```

**Result**:
- ✅ Google Maps URLs (`https://www.google.com/maps/*`) open in default browser
- ✅ All external URLs open in default browser
- ✅ Phone numbers are clickable in Google Maps
- ✅ Full Google Maps functionality available
- ✅ No embedded Google content in Electron window

**Menu**:
- ✅ Reload
- ✅ Toggle DevTools (dev mode only)
- ✅ Standard app menu (Edit, View, Window, Help)

**Scripts**:
- ✅ `npm run desktop:dev` - Development mode
- ✅ `npm run desktop:build` - Build distributables (optional)

## Success Criteria ✅

- ✅ Desktop app launches and loads the web app
- ✅ Clicking a dispensary opens Google Maps externally
- ✅ Google Maps shows:
  - Business name
  - Phone number (if available)
  - Directions
  - Full business details
- ✅ Works the same on web and desktop
- ✅ No backend or pipeline changes

## How It Works

### Web (Browser)
1. User clicks dispensary card or button
2. `window.open()` is called with Google Maps URL
3. Browser opens new tab with Google Maps

### Desktop (Electron)
1. User clicks dispensary card or button
2. `window.open()` is called with Google Maps URL
3. Electron's `setWindowOpenHandler` intercepts
4. `shell.openExternal()` opens URL in default browser
5. Google Maps opens in real browser with full functionality

## Testing

### Test on Web
1. Navigate to `/garden/dispensaries`
2. Search for dispensaries
3. Click a dispensary card or "Open in Google Maps" button
4. Verify Google Maps opens in new tab with business details

### Test on Desktop
1. Run `npm run desktop:dev`
2. Navigate to Dispensary Finder in the app
3. Search for dispensaries
4. Click a dispensary card or button
5. Verify Google Maps opens in default browser (not in Electron window)
6. Verify phone number and directions are available in Google Maps

## Notes

- Google Maps URL uses name + address for best search results
- Electron wrapper ensures all external links open in default browser
- No phone numbers stored or displayed in-app
- Full Google Maps functionality available in external browser
- Works identically on web and desktop
