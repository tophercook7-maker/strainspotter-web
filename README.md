# StrainSpotter

The cannabis companion built for honesty.

> **Honest scanning. Full-lifecycle grow doctor.** From picking the right
> seeds, to diagnosing yellow leaves, to understanding what you grew —
> StrainSpotter is a Next.js app that respects what AI can and can't do.

---

## What this app does

### Scan & Analyze (`/garden/scanner`)

A single GPT-4o Vision call analyzes any cannabis-related photo and returns:

- **OCR text** — every readable word from the image
- **Visual traits** — bud structure, trichome coverage, pistil color, leaf shape, coloration
- **Likelihood** — calibrated terpene-family and effect-family probabilities
- **Top 1-5 candidate strains** from a 314-cultivar catalog with **honest 0-100 confidence** (no inflated floor)
- **Seller's-claim validation** — when the user enters what the seller claimed, we evaluate the visual evidence against that claim and report consistent / ambiguous / inconsistent

The whole pipeline is OCR-first by design: when there's a label, we use it. When there isn't, we return multi-candidate output rather than picking one strain with fake confidence.

A first-visit modal sets honest expectations: works best with labels; phenotype variation makes specific strain ID from unlabeled bud photos genuinely hard, even for experts. The app surfaces a "doesn't look like cannabis" banner when the model can't see cannabis instead of hallucinating a strain match.

### Grow Doctor (`/garden/grow-coach`)

A full-lifecycle grow companion across 9 stages:

1. **Sourcing** — strain selection, photoperiod vs autoflower, feminized vs regular, reputable breeders, seed quality, goal-setting
2. **Germination** — paper-towel method, when to plant, first moisture
3. **Seedling** — light, watering, temperature, why not to feed yet
4. **Vegetative** — nitrogen, training (LST, topping, SCROG), light intensity, when to flip
5. **Flowering** — the flip, the stretch, P-K nutrients, humidity, trichome watch, optional flush
6. **Drying** — slow & dark, airflow, when it's done, wet vs dry trim
7. **Curing** — mason jars, the burping rhythm, humidity packs, how long
8. **Harvested** — documenting, dialing in records, saving genetics
9. **Partake** — long-term storage, consumption methods (educational), decarboxylation, start-low-go-slow, set & setting, practical safety

Each stage has 4-7 substantive tips written in the voice of an experienced grower.

**Diagnostic mode** — a separate GPT-4o Vision endpoint that analyzes photos of plant problems (yellow leaves, pests, weird buds) and returns ranked likely causes with calibrated confidence, severity assessment, immediate same-day actions, monitor list, and prevention tips. Apple-safe framing throughout.

### Strain library, terpenes, dispensaries, journal, etc.

The rest of `/garden/*` is a working strain library, terpene reference, dispensary directory (read-only, no purchase facilitation), favorites, and personal journal. See `app/garden/page.tsx` for the full feature list.

---

## Architecture (May 2026)

```
Next.js 14 App Router (TypeScript)
├─ app/
│  ├─ api/scan/route.ts ............ Edge runtime — GPT-4o Vision (Phase 2: OCR-first)
│  ├─ api/grow-doctor/diagnose ..... Edge runtime — GPT-4o cultivation diagnostic
│  ├─ api/{auth,stripe,profile,...}  Other backend routes
│  └─ garden/* ..................... All user-facing pages
├─ lib/
│  ├─ scanner/ ..................... Scan orchestrator + view models + types
│  ├─ growlog/ ..................... Grow / plant / saved-scan storage layer
│  ├─ strain-data/ ................. Strain catalog providers
│  └─ ageGate.ts ................... 18+ verification (localStorage-backed)
├─ components/
│  ├─ AgeGate.tsx .................. Wraps RootLayout — gates access for 18+
│  └─ ... .......................... Shared UI components
└─ public/
   ├─ icons/app/icon-{16..1024}.png .. Full app-icon size set
   ├─ manifest.json .................. PWA manifest
   └─ StrainSpotterEmblem.png ........ 1024px master
```

### Key choices and why

- **Edge runtime for `/api/scan`** because GPT-4o Vision can take 15-30s and Vercel Hobby's serverless limit is 10s
- **OpenAI as sole AI provider.** A previous CLIP-embedding pipeline was archived to `lib/scanner/_unused/` — it never beat GPT-4o on accuracy at our reference-image scale and the operational cost wasn't worth the complexity
- **Strict copyright safety** in scanner output — no song-lyric-style reproduction of source material; system prompt explicitly forbids medical claims
- **18+ gate, not 21+** — globally consistent; the actual legal age varies by jurisdiction and the app disclaims that

---

## Local development

```bash
# Required
cp .env.example .env.local           # fill in OPENAI_API_KEY + Supabase keys
npm install                          # node 20+, npm 10+
npm run dev                          # http://localhost:3000
```

`tsc --noEmit` should pass cleanly. `npm run build` should compile all 31 routes.

See `.env.example` for the full list of required and optional environment variables, organized by category.

---

## Deploy

Deployed to Vercel. Push to `main` triggers a production build. The build settings rely on Next.js auto-detection — no custom config needed.

For App Store submission, see `docs/APP_STORE_LISTING.md` and `docs/PRIVACY_MANIFEST_NOTES.md`.

---

## Repo structure caveats

- **`lib/scanner/_unused/`** — files from the abandoned CLIP-embedding scanner pipeline. Not reachable from any entry point. Kept for reference; excluded from `tsc` via `tsconfig.json`.
- **`scripts/`** — maintenance scripts (reference image library tools, scanner recalibration, etc.). Excluded from the web build.
- **`__quarantine__/`** and **`pipeline-control/`** — old experimental code. Ignore.
- **`* 2.ts` / `* 3.ts` files** — macOS Finder/iCloud sync conflict copies. Gitignored. If they appear locally, run `find . -name "* 2.*" -delete` to clear.

---

## Status

Production-ready for web deploy and PWA install. Native iOS submission requires a Capacitor wrap step (not yet done). See the privacy notes doc for that path.
