# How to Build and Run the StrainSpotter Desktop App

## Quick Start

### Step 1: Build the Desktop App

```bash
cd /Users/christophercook/Desktop/strainspotter-web
npm run tauri:build
```

This will:
- Compile the Rust backend
- Bundle the desktop app
- Create installers for your platform

### Step 2: Find Your Built App

After building, the app will be located at:

**macOS:**
```
src-tauri/target/release/bundle/macos/StrainSpotter.app
```

**Windows:**
```
src-tauri/target/release/bundle/msi/StrainSpotter_0.1.0_x64.exe
```

**Linux:**
```
src-tauri/target/release/bundle/appimage/StrainSpotter_0.1.0_amd64.AppImage
```

### Step 3: Run the App

**macOS:**
```bash
open src-tauri/target/release/bundle/macos/StrainSpotter.app
```

Or double-click `StrainSpotter.app` in Finder.

**Windows:**
Double-click the `.exe` file or run:
```bash
src-tauri/target/release/bundle/msi/StrainSpotter_0.1.0_x64.exe
```

**Linux:**
```bash
chmod +x src-tauri/target/release/bundle/appimage/StrainSpotter_0.1.0_amd64.AppImage
./src-tauri/target/release/bundle/appimage/StrainSpotter_0.1.0_amd64.AppImage
```

## What the App Does

The desktop app is a **remote webview** that loads:
```
https://app.strainspotter.app
```

It will:
- Open a window (1280x800)
- Load the production web app
- Work offline for cached content
- Provide a native desktop experience

## Troubleshooting

### Build Fails

If `npm run tauri:build` fails:

1. **Check Rust is installed:**
   ```bash
   rustc --version
   cargo --version
   ```

2. **Check Tauri CLI:**
   ```bash
   npm run tauri -- --version
   ```

3. **Try direct Tauri command:**
   ```bash
   npx tauri build
   ```

### App Won't Load

- Ensure `https://app.strainspotter.app` is accessible
- Check your internet connection
- Verify the URL in `src-tauri/tauri.conf.json`

### Development Mode

**⚠️ Do NOT use `npm run tauri:dev`** - it's not supported for remote URLs and will cause restart loops.

Use `npm run tauri:build` instead.

## Alternative: Quick Test

If you just want to see if it works quickly:

```bash
# Build (this takes a few minutes the first time)
npm run tauri:build

# On macOS, open the app immediately
open src-tauri/target/release/bundle/macos/StrainSpotter.app
```

The first build will take longer as it compiles Rust dependencies. Subsequent builds are faster.
