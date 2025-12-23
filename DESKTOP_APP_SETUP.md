# Desktop App Setup — Electron Wrapper

## Overview

Minimal Electron desktop wrapper for the StrainSpotter web app. No feature changes—just a desktop shell.

## Quick Start

### 1. Install Desktop Dependencies

```bash
cd desktop
npm install
```

### 2. Development Mode

Run desktop app loading from localhost:

```bash
# From project root
npm run desktop:dev

# Or manually
cd desktop
STRAINSPOTTER_URL=http://localhost:3000 npm run dev
```

**Note**: Make sure your Next.js dev server is running (`npm run dev`) before launching the desktop app.

### 3. Production Mode

Run desktop app loading from production URL:

```bash
cd desktop
STRAINSPOTTER_URL=https://your-vercel-app.vercel.app npm start
```

## Configuration

### Environment Variables

- `STRAINSPOTTER_URL`: URL to load the web app from
  - Dev: `http://localhost:3000` (or your dev port)
  - Prod: `https://your-vercel-app.vercel.app`
  - Default: `http://localhost:3000` if not set

### Window Settings

- Default size: 1200x800
- Minimum size: 800x600
- Remembers last position and size
- State saved to: `~/Library/Application Support/strainspotter-desktop/window-state.json` (macOS)

## Features

### Security

- ✅ `contextIsolation: true` - Isolated context
- ✅ `nodeIntegration: false` - No Node.js in renderer
- ✅ `enableRemoteModule: false` - No remote module
- ✅ `sandbox: true` - Additional sandboxing
- ✅ External links open in default browser
- ✅ Navigation restricted to same origin

### Menu

- **StrainSpotter** (macOS) / **File** (other platforms)
  - About, Services, Hide/Show, Quit
- **Edit**
  - Undo, Redo, Cut, Copy, Paste, Select All
- **View**
  - Reload, Force Reload
  - Zoom controls
  - Toggle Full Screen
  - Toggle Developer Tools (dev mode only)
- **Window**
  - Minimize, Close
- **Help**
  - Learn More (opens website)

### Window Management

- Remembers size and position between sessions
- Restores maximized state if window was maximized
- Auto-saves state on move/resize (debounced)

## File Structure

```
desktop/
  ├── main.js          # Electron main process
  ├── preload.js       # Preload script (security bridge)
  ├── package.json     # Desktop app dependencies
  ├── README.md        # Desktop-specific docs
  └── .gitignore       # Desktop build artifacts
```

## Building Distributables

To create platform-specific installers (optional):

```bash
cd desktop
npm run build
```

This requires `electron-builder` and will create installers in `desktop/dist/`.

## Troubleshooting

### App won't load

1. Check that `STRAINSPOTTER_URL` is correct
2. Verify the web app is accessible at that URL
3. Check console for errors (View → Toggle Developer Tools)

### Window state issues

- Delete `window-state.json` in app user data directory to reset
- Location: `~/Library/Application Support/strainspotter-desktop/` (macOS)

### Dev tools not showing

- Dev tools only available in dev mode (`--dev` flag or `NODE_ENV=development`)
- Use View → Toggle Developer Tools menu item

## Notes

- Desktop app is a thin wrapper—all functionality comes from web app
- No changes to web app behavior
- Works on macOS (tested), should work on Windows/Linux
- Window state persists between sessions
- External links automatically open in default browser
