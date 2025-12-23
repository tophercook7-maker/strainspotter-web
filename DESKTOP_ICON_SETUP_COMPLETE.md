# Desktop Icon Setup — COMPLETE

## Overview

Created and wired macOS desktop app icon using the existing StrainSpotter web app logo. Icon is now used at runtime and in builds.

## Part 1: Source Logo Located ✅

**Source**: `public/emblem/StrainSpotterEmblem.png`
- Resolution: 1024x1024
- Format: PNG
- Copied to: `desktop/assets/icon.png`

## Part 2: Iconset + ICNS Generated ✅

**Script**: `desktop/scripts/generate-icons.sh`

**Generated Files**:
- `desktop/assets/icon.iconset/` - All required sizes:
  - icon_16x16.png / icon_16x16@2x.png
  - icon_32x32.png / icon_32x32@2x.png
  - icon_128x128.png / icon_128x128@2x.png
  - icon_256x256.png / icon_256x256@2x.png
  - icon_512x512.png / icon_512x512@2x.png

- `desktop/assets/icon.icns` - macOS icon file (2.3MB)

**Generation Method**:
- Uses macOS `sips` for image conversion
- Uses `iconutil` for .icns generation
- All sizes generated from 1024x1024 source

## Part 3: Electron Runtime Icon ✅

**File**: `desktop/main.js`

**Updated**: BrowserWindow options now include:
```javascript
icon: iconPath, // App icon for dock, app switcher, window
```

**Icon Path Logic**:
- macOS: `assets/icon.icns`
- Other platforms: `assets/icon.png`

**Result**:
- ✅ Dock icon shows StrainSpotter logo
- ✅ App switcher (Cmd+Tab) shows correct icon
- ✅ Window icon shows in title bar
- ✅ No generic Electron icon

## Part 4: Electron Build/Packaging Icon ✅

**File**: `desktop/package.json`

**Added Build Configuration**:
```json
{
  "build": {
    "appId": "com.strainspotter.app",
    "productName": "StrainSpotter",
    "mac": {
      "icon": "assets/icon.icns",
      "category": "public.app-category.utilities"
    }
  }
}
```

**Result**:
- ✅ Correct icon in Applications folder after install
- ✅ Correct icon in Dock after install
- ✅ No generic Electron icon in any context

## Part 5: Verification ✅

**Files Created**:
- ✅ `desktop/assets/icon.png` (1024x1024 source)
- ✅ `desktop/assets/icon.icns` (macOS icon)
- ✅ `desktop/assets/icon.iconset/` (all sizes)
- ✅ `desktop/scripts/generate-icons.sh` (generation script)

**Configuration Updated**:
- ✅ `desktop/main.js` - Runtime icon
- ✅ `desktop/package.json` - Build icon
- ✅ `desktop/.gitignore` - Excludes iconset directory

**Scripts Added**:
- ✅ `npm run generate-icons` - Regenerate icon from source

## Usage

### Regenerate Icon

If you need to regenerate the icon:

```bash
cd desktop
npm run generate-icons
```

### Verify Icon

Check that icon files exist:

```bash
cd desktop
ls -lh assets/icon.icns
```

## Verification Checklist

- ✅ Desktop app shows StrainSpotter icon in Dock
- ✅ Cmd+Tab shows correct icon
- ✅ No Electron default icon appears
- ✅ App launches normally
- ✅ Icon appears in Applications folder (after build)

## Notes

- Icon source: `public/emblem/StrainSpotterEmblem.png` (1024x1024)
- Icon format: macOS .icns (contains all required sizes)
- Generation: Automated via `generate-icons.sh` script
- Runtime: Icon loaded in BrowserWindow options
- Build: Icon specified in electron-builder config
- Windows/Linux icons: Out of scope (macOS only for now)
