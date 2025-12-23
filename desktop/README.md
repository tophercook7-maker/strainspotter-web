# StrainSpotter Desktop App

Minimal Electron wrapper for the StrainSpotter web application.

## Setup

### Install Dependencies

```bash
cd desktop
npm install
```

### Generate App Icon

The app icon is generated from the StrainSpotter Emblem. To regenerate:

```bash
cd desktop
npm run generate-icons
```

This creates:
- `assets/icon.icns` - macOS app icon
- `assets/icon.iconset/` - Icon source files (can be deleted after .icns is created)

**Source**: The icon uses `public/emblem/StrainSpotterEmblem.png` (the main brand image used in the scanner page).

### Development

Run the desktop app in development mode (loads from localhost:3000):

```bash
# From project root
npm run desktop:dev

# Or from desktop folder
cd desktop
STRAINSPOTTER_URL=http://localhost:3000 npm run dev
```

### Production

Run the desktop app in production mode (loads from production URL):

```bash
cd desktop
STRAINSPOTTER_URL=https://your-vercel-app.vercel.app npm start
```

## Configuration

Set the `STRAINSPOTTER_URL` environment variable to control which URL the app loads:

- **Development**: `STRAINSPOTTER_URL=http://localhost:3000`
- **Production**: `STRAINSPOTTER_URL=https://your-vercel-app.vercel.app`

If not set, defaults to `http://localhost:3000`.

## Features

- ✅ **Security**: contextIsolation, no nodeIntegration, no remote module
- ✅ **Window State**: Remembers last window size and position
- ✅ **Menu**: Basic app menu with reload and dev tools (dev only)
- ✅ **External Links**: Opens external links in default browser
- ✅ **macOS Support**: Native macOS menu and window behavior

## Window Settings

- Default size: 1200x800
- Minimum size: 800x600
- Remembers position and size between sessions

## Security

The app follows Electron security best practices:

- `contextIsolation: true` - Isolates preload script context
- `nodeIntegration: false` - No Node.js in renderer
- `enableRemoteModule: false` - No remote module access
- `sandbox: true` - Additional sandboxing
- External links open in default browser
- Navigation restricted to same origin

## Building

To build distributable packages (requires electron-builder):

```bash
cd desktop
npm run build
```

This will create platform-specific installers in the `dist/` folder.

## Notes

- The desktop app is a thin wrapper around the web app
- No changes to web app behavior
- All functionality comes from the web app
- Window state is saved to `window-state.json` in user data directory
