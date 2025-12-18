# OTA Update Strategy (Capacitor)

The native iOS/Android shells load the built Vite app from `frontend/dist/`. To ship UI updates without App Store resubmission:

1. **Build the web app**
   ```bash
   cd frontend
   npm install
   npm run build   # outputs dist/
   ```

2. **Sync Capacitor assets**
   ```bash
   npx cap sync ios
   npx cap sync android   # if Android project is present
   ```

3. **Open native projects**
   ```bash
   npx cap open ios
   npx cap open android
   ```
   Rebuild inside Xcode / Android Studio to package the refreshed `dist/` files.

4. **Deploy**
   - For TestFlight/Play Console binaries, rebuild and upload the native project.
   - For internal OTA testing (without resubmission), you can ship updated `dist/` files via remote hosting and instruct the Capacitor shell to load them (see below).

---

## Dev Hot Reload

When iterating locally you can point Capacitor to the Vite dev server instead of the compiled `dist` bundle:

1. Set `CAP_DEV_SERVER=true` before running Capacitor commands.
2. Ensure `capacitor.config.ts` has:
   ```ts
   server: { url: 'http://localhost:5173', cleartext: true }
   ```
3. Run `npm run dev` and launch the native app; it will proxy to the dev server for instant refreshes.

Reset `CAP_DEV_SERVER` (or rebuild) before shipping to ensure the shell bundles `dist/`.

---

## Production OTA Guidance

Apple/Google permit serving remote web content from a Capacitor shell as long as you do not change the primary purpose of the app. Our approach:

- Always host the latest `dist` bundle on the backend (`/dist` assets served from Render/Vercel).
- Capacitor loads `dist/` from the app package by default. To push an OTA update, rebuild `dist`, run `npx cap copy`, and redistribute the bundle via the native OTA mechanism you use (e.g., push a new binary or use a sanctioned in-app updater).
- Avoid pointing production builds directly at a remote dev server; only use the packaged assets or a trusted CDN under your control.

Document each OTA in release notes:

1. Frontend commit SHA.
2. Date/time of `npm run build`.
3. Capacitor platforms synced (`ios`, `android`).
4. Verification steps (smoke test, moderation flows, purchase flows).

This ensures Apple/Google reviewers can trace every update and confirms we are not bypassing review with major functionality changes.


