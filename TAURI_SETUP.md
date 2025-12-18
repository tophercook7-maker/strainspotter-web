# Tauri Desktop App Setup

## Overview

StrainSpotter is wrapped as a native desktop application using Tauri. The app loads the UI from a remote URL, enabling instant updates without reinstalling.

## Prerequisites

1. **Rust** - Install from https://rustup.rs/
2. **Node.js** - Already installed
3. **System dependencies** (macOS):
   ```bash
   # Already installed if Rust works
   ```

## Project Structure

```
strainspotter-web/
├── src-tauri/          # Tauri Rust backend
│   ├── src/
│   │   └── main.rs     # Tauri entry point
│   ├── Cargo.toml      # Rust dependencies
│   ├── tauri.conf.json # Tauri configuration
│   └── icons/          # App icons
├── package.json        # NPM scripts for Tauri
└── ...
```

## Configuration

### Remote UI Loading (CRITICAL)

The app loads the UI from a remote URL. This enables:
- ✅ UI updates without reinstall
- ✅ Feature flags
- ✅ Kill switches
- ✅ Membership changes without store approval

**Default URL:** `https://strainspotter.com`

**To change the remote URL:**

1. Edit `src-tauri/tauri.conf.json`:
   ```json
   {
     "build": {
       "frontendDist": "https://your-domain.com"
     }
   }
   ```

2. Or use the setup script:
   ```bash
   REMOTE_URL=https://your-domain.com npm run tauri:remote
   ```

### Window Configuration

- **Default size:** 1280x800
- **Minimum size:** 800x600
- **Resizable:** Yes
- **Remembers:** Last window size and position

### Security

- **CSP (Content Security Policy):** Restricts navigation to allowed domains
- **Allowed domains:**
  - `*.supabase.co` (Supabase API)
  - `*.supabase.in` (Supabase India)
  - `api.openai.com` (OpenAI API)
  - Your production domain

- **File access:** Disabled (no arbitrary file access)
- **HTTPS only:** Enforced for remote loading

## Development

### Run in Development Mode

```bash
# Start Next.js dev server
npm run dev

# In another terminal, run Tauri
npm run tauri:dev
```

This will:
1. Start Next.js on `http://localhost:3000`
2. Open Tauri window loading from localhost
3. Hot-reload on code changes

### Build for Production

```bash
# Build Next.js
npm run build

# Build Tauri app
npm run tauri:build
```

**Output:**
- macOS: `src-tauri/target/release/bundle/macos/StrainSpotter.app`
- Windows: `src-tauri/target/release/bundle/msi/StrainSpotter_0.1.0_x64_en-US.msi`

## Auto-Update (Shell Only)

Auto-updater is **disabled by default**. When enabled, it will:
- ✅ Update the Tauri shell (Rust backend)
- ❌ NOT update the UI (UI comes from remote)

**To enable auto-update:**

1. Set up update server
2. Configure in `src-tauri/tauri.conf.json`:
   ```json
   {
     "updater": {
       "active": true,
       "endpoints": ["https://updates.strainspotter.com/"],
       "pubkey": "YOUR_PUBLIC_KEY"
     }
   }
   ```

## Branding

### App Identity

- **Name:** StrainSpotter
- **Identifier:** `com.strainspotter.app`
- **Version:** 0.1.0
- **Description:** "StrainSpotter — Early Test Build"

### Icons

Icons are located in `src-tauri/icons/`. Required sizes:
- 32x32.png
- 128x128.png
- 128x128@2x.png
- 256x256.png
- 256x256@2x.png
- 512x512.png
- 512x512@2x.png

**To generate icons from SVG:**

```bash
# Install icon generator (if needed)
npm install -g @tauri-apps/cli

# Generate icons from SVG
# (Manual process - use ImageMagick or online tools)
```

## Private Distribution

### macOS

1. **Build:**
   ```bash
   npm run tauri:build
   ```

2. **Sign (optional, for distribution):**
   ```bash
   codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name" src-tauri/target/release/bundle/macos/StrainSpotter.app
   ```

3. **Create DMG (optional):**
   ```bash
   hdiutil create -volname "StrainSpotter" -srcfolder src-tauri/target/release/bundle/macos/StrainSpotter.app -ov -format UDZO StrainSpotter.dmg
   ```

### Windows

1. **Build:**
   ```bash
   npm run tauri:build
   ```

2. **Output:** MSI installer in `src-tauri/target/release/bundle/msi/`

## Testing

### Test Remote URL

1. Deploy your app to a test URL
2. Update `src-tauri/tauri.conf.json` with test URL
3. Build and test:
   ```bash
   npm run tauri:build
   ```

### Test Local Development

1. Start Next.js:
   ```bash
   npm run dev
   ```

2. Run Tauri:
   ```bash
   npm run tauri:dev
   ```

## Troubleshooting

### "Cargo not found"

Install Rust: https://rustup.rs/

### "Window doesn't load"

1. Check `devPath` in `tauri.conf.json` matches your dev server
2. Ensure Next.js is running on the correct port
3. Check browser console in Tauri window (right-click → Inspect)

### "CSP errors"

Update CSP in `tauri.conf.json` to allow your domains.

### "Build fails"

1. Check Rust version: `rustc --version` (should be 1.70+)
2. Clean build: `cd src-tauri && cargo clean`
3. Rebuild: `npm run tauri:build`

## Next Steps

1. ✅ Generate app icons from brand mark
2. ✅ Set up production remote URL
3. ✅ Configure auto-update (when ready)
4. ✅ Test on macOS and Windows
5. ✅ Prepare signed builds for distribution

---

**Tauri setup is complete!** 🎉
