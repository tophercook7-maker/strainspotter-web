This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment variables

Copy `.env.example` to `.env.local` and fill in values.

| Variable | Where | Purpose |
|----------|--------|---------|
| `OPENAI_API_KEY` | Server | Required for strain vision scans (`/api/scan`). |
| `OPENAI_SCAN_MODEL` | Server | OpenAI chat model id for scans. Defaults to `gpt-4o-2024-11-20` if unset. |
| `NEXT_PUBLIC_SCANNER_CENTER_CROP` | Client | When not `"false"`, center-crops very wide/tall photos toward 4:3 or 3:4 before JPEG resize in the scanner prep step. |
| `NEXT_PUBLIC_API_BASE_URL` | Client | Optional API origin (no trailing slash). **Empty** = same-origin `/api/*` (Vercel web). Set to `https://strainspotter.com` for Capacitor / Tauri builds where the WebView origin is not the API host. |

Scan prep also sends `clientPrepDiagnostics.exposureLiftGains` (per image) on each `/api/scan` request; the route logs them for debugging alongside `openAiModel`.

## Native shells (Capacitor + Tauri)

Production web app: **https://strainspotter.com** (Vercel). Native wrappers reuse the same UI and APIs.

### Capacitor (iOS + Android)

1. `npm install`
2. `npm run cap:prep` — creates `out/index.html` (required `webDir` for Capacitor).
3. `npx cap add ios` and `npx cap add android` once per machine (generates `ios/` and `android/`; not tracked in git with the current ignore rules — regenerate anytime).
4. `npm run cap:sync` — copy web assets + sync plugins.
5. `npm run cap:ios` / `npm run cap:android` — open Xcode / Android Studio.

`capacitor.config.ts` uses **`server.url` → `https://strainspotter.com`** so the shell loads the live site (easy to switch later to a bundled static `out/` export by removing `server` and shipping a Next static build into `webDir`).

### Tauri (desktop)

1. Install [Rust](https://rustup.rs/) on the build machine.
2. `npm install`
3. `npm run cap:prep` (provides `out/` for `frontendDist` fallback).
4. `npm run tauri:dev` — loads `http://localhost:3000` (run `npm run dev` in another terminal).
5. `npm run tauri:build` — platform installers (macOS / Windows / Linux) on the host OS.

### Scanner golden tests

`npm test` includes **geometry golden** checks in `lib/scanner/scannerGoldenGeometry.test.ts` (stable crop + scale fingerprints). Update those strings only when intentionally changing prep rules.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Trigger deployment with vercel.json - Tue Dec 23 10:42:28 CST 2025
