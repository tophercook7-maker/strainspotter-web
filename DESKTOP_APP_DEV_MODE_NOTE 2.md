# Desktop App Development Mode - Important Note

## Remote URL Configuration

The StrainSpotter desktop app is configured as a **remote webview app** that loads:
```
https://app.strainspotter.app
```

## Development Mode Limitation

**⚠️ IMPORTANT:** `tauri dev` (development mode) is **NOT SUPPORTED** for remote URL configurations.

### Why?

When Tauri is configured to load a remote URL in dev mode, it can cause:
- Restart loops
- Connection issues
- Unstable behavior

This is expected behavior for remote webview apps and is not a bug.

### How to Test the Desktop App

**Use production builds instead:**

```bash
# Build the desktop app
npm run tauri:build

# Test the built app
# macOS: Open src-tauri/target/release/bundle/macos/StrainSpotter.app
# Windows: Run src-tauri/target/release/bundle/msi/StrainSpotter_*.exe
# Linux: Run src-tauri/target/release/bundle/appimage/StrainSpotter_*.AppImage
```

### For Development

Since the desktop app loads the production web app, you should:
1. Develop and test the web app in the browser: `npm run dev`
2. Deploy changes to `https://app.strainspotter.app`
3. Build and test the desktop app: `npm run tauri:build`

### Alternative: Local Development

If you need to test desktop-specific features during development, you can temporarily:
1. Build the web app locally: `npm run build`
2. Update `tauri.conf.json` to use `"devUrl": "http://localhost:3000"` (requires Next.js dev server running)
3. Use `tauri dev` (but this is not the production configuration)

**Note:** The production configuration uses the remote URL and should be tested with `tauri build`.
