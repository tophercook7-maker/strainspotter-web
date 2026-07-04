# StrainSpotter — Claude / Cursor Handoff

Last updated: May 6, 2026 (post-pivot, post-Grow-Doctor launch)

This is what a future Claude or Cursor agent needs to know to be useful
in this codebase. If you're new here, read top-to-bottom.

---

## What StrainSpotter is, today

A Next.js 14 App Router web app for cannabis identification, cultivation
coaching, and strain reference. Production-ready for web; a future
Capacitor wrap will produce the iOS / Android binaries.

**Two flagship features:**

1. **Scan & Analyze** (`/garden/scanner`) — single GPT-4o Vision call
   returning OCR text, observable visual traits, multi-candidate strain
   matches with calibrated 0–100 confidence, and seller's-claim
   validation when the user provides one.

2. **Grow Doctor** (`/garden/grow-coach`) — full cannabis cultivation
   lifecycle from seed sourcing through informed enjoyment, with 9
   stages × 4-7 substantive tips each, AND a separate diagnostic mode
   (`/api/grow-doctor/diagnose`) that analyzes photos of plant problems
   and returns ranked likely causes with severity and same-day actions.

Plus the supporting cast: 314-strain catalog, terpene reference,
dispensary directory (read-only — does NOT facilitate purchase),
favorites, journal, age gate, settings, profile.

---

## Architectural ground truth

Read these in order; they're the real source of truth:

1. `README.md` — top-level architecture summary
2. `HOW_SCANNER_WORKS.md` — current scanner pipeline (the v1 doc that
   described Google Cloud Vision OCR is gone; this is the only one)
3. `docs/APP_STORE_LISTING.md` — listing copy + Apple review notes
4. `docs/PRIVACY_MANIFEST_NOTES.md` — what to do when wrapping native

### What is NOT the source of truth anymore

The historic CLIP-embedding scanner pipeline (visualEmbeddingMatcher,
referenceTrustWeighting, strainMatcher, etc.) is archived under
`lib/scanner/_unused/`. **Do not reintroduce it without explicit
direction from Topher.** The reference-image library never reached the
scale needed for it to outperform GPT-4o on accuracy at our cost
profile, and it added significant operational complexity. If reviving,
the README inside `_unused/` explains the path.

---

## Working agreements when editing this codebase

These are derived from how Topher likes to work:

1. **Single copy/paste blocks for Cursor.** When generating code for
   Topher to paste, deliver one complete block — no "fill this in"
   placeholders.

2. **Plain bias-aware language in scanner output.** No medical claims.
   "Users commonly report" instead of "treats". This is hardcoded into
   the system prompts and any UI copy must match.

3. **Apple-safe.** Educational, identification, and cultivation framing.
   No facilitation-of-sale anywhere. No content directed at minors.
   Age gate is 18+, easy to clear from Settings → Privacy & Age.

4. **Honest confidence.** The scanner is calibrated 0–100 with explicit
   ranges in the system prompt; do not introduce floor inflation. If a
   model returns a range we trained against and it feels low, that's
   the point.

5. **Don't break the build to add features.** `npx tsc --noEmit` and
   `npm run build` should both stay green at every commit.

6. **Finder/iCloud sibling-named copies (`* 2.tsx`, `* 3.ts`) keep
   appearing.** They're gitignored. If you see one locally, run
   `find . -path ./node_modules -prune -o \( -name "* 2.*" -o
   -name "* 3.*" \) -delete` before running typecheck.

---

## What's working as of this handoff

- TypeScript clean (`tsc --noEmit` exit 0)
- `npm run build` produces 31 routes, no errors, no warnings of substance
- Age gate, scanner with all Phase 2 surfaces, Grow Doctor with
  diagnostic mode, settings, strain library, terpenes — all functional
- App icon generated from `public/StrainSpotterEmblem.png` (1024 master)
  to all standard iOS / PWA sizes; PWA manifest live; meta tags wired

## What's pending

- **Capacitor wrap** for iOS / Android binaries. See
  `docs/PRIVACY_MANIFEST_NOTES.md`. Estimated 2-3 days of plumbing.
- **Privacy policy + Terms of Service pages.** Currently exempted from
  the AgeGate routing wrapper but the actual page content is TBD. Apple
  will require live URLs at submission.
- **Test account** for the App Store review notes — the listing copy has
  a `[TODO]` placeholder for credentials.
- **Rest-of-garden polish.** Scanner and Grow Doctor are the priority
  surfaces; the other garden tabs are functional but inconsistent in
  visual polish.

---

## Things that previously caused problems

(Sharing so future-you doesn't repeat them.)

- **Auto-fix loops.** Cursor and Claude have both run agents on this
  codebase concurrently. If you see uncommitted modifications when you
  arrive, check `git diff` carefully; another agent may have done your
  work for you, or may have introduced something you'd want to revert.

- **macOS sibling copies.** `* 2.tsx` files are sync-conflict copies and
  are gitignored, but if Finder duplicates them mid-run, `tsc` picks them
  up. The cleanup command above keeps things sane.

- **Supabase `listUsers()` discriminated-union narrowing.** Don't
  destructure `{data, error}` and then narrow on error — TS can't
  follow the narrowing across the destructure. Pattern that works:
  keep the response intact, early-return on `.error`, then cast to the
  success-branch shape.

- **HEIC images from iPhone.** Handled via `heic2any`; this is in
  `package.json` and must stay there even if it looks unused at first
  scan.
