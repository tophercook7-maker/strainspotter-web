# StrainSpotter — Claude handoff (project status)

This note summarizes purpose, architecture, recent fixes, and how to operate StrainSpotter safely **without committing secrets or TheVault image data**.

---

## A. Project purpose

StrainSpotter is a **scanner / image-recognition** system for **cannabis strain identification** from photos.

**Goals**

- Best-in-market scanner using **local embeddings**, **reference image libraries**, **Supabase** for cloud metadata + selective asset sync, **user feedback**, and **trusted confirmations**.
- **OpenAI stays off / free mode** unless explicitly enabled by maintainers (cost control).

---

## B. Current architecture

| Layer | Role |
|--------|------|
| **Next.js app (local checkout)** | Primary codebase at **`/Users/christophercook/Desktop/strainspotter-web`** |
| **TheVault (external disk)** | Large **local image lake**: **`/Volumes/TheVault/StrainSpotter/reference-images/`** — downloads, caches, training captures live here |
| **Supabase** | Cloud **metadata + storage buckets** for approved references, training images, and raw/non-matchable lake rows |

**Matching behavior**

- Scanner ranking uses **approved / trusted / matchable** references only (see `is_matchable`, `library_tier`, `review_status`, `trust_level`, `disabled` on rows).
- **Raw / pending / rejected** images may exist for training and filtering later but **must not participate as matchable references**.

---

## C. TheVault access

**Expected layout**

```
/Volumes/TheVault/StrainSpotter/reference-images/cache/
/Volumes/TheVault/StrainSpotter/reference-images/raw/
/Volumes/TheVault/StrainSpotter/reference-images/training/
```

**Operational rules**

1. **Mount TheVault** before **download / index / embed / sync** scripts that resolve files under `/Volumes/TheVault/...`.
2. If TheVault is **missing**, storage scripts (`check-storage`, downloads, embedding index) should **fail or warn** rather than silently writing into git-managed folders.
3. **Never move or copy TheVault binaries into git.** Large binaries belong only on TheVault + Supabase buckets.

See also repo doc **`THEVAULT_STORAGE_SETUP.md`** for migration/setup narrative.

---

## D. Supabase setup

### Buckets

| Bucket | Purpose |
|--------|---------|
| **`scanner-reference-images`** | Approved / trusted **production** reference thumbnails/objects |
| **`scanner-training-images`** | **User-confirmed scan / training** lineage uploads |
| **`scanner-reference-raw-images`** | Raw / pending / rejected / **non-matchable lake** storage |

### Table: `public.scanner_reference_images`

Important columns (non-exhaustive):

- **`strain_slug`**, **`strain_name`**
- **`content_hash`**
- **`storage_bucket`**, **`storage_path`**, **`public_url`**
- **`raw_storage_bucket`**, **`raw_storage_path`**, **`raw_public_url`**
- **`review_status`**, **`trust_level`**
- **`disabled`**, **`disabled_reason`**
- **`is_matchable`**
- **`library_tier`**

**Unique constraint (logical dedupe key)**

- **`unique(strain_slug, content_hash)`** — duplicates must be **recovered** by selecting the existing row and **updating by id**, not by weakening uniqueness blindly.

---

## E. Environment / secrets

**Do not commit real secrets.** Git ignores `.env`, `.env.local`, `env/.env.local`, and similar — **verify before every push**.

**Typical local env locations** (examples only — paths exist per-machine):

- `env/.env.local`
- `.env.local`

**Scanner / cost**

```bash
SCANNER_AI_PROVIDER=off
SCANNER_COST_MODE=free
SCANNER_USE_OPENAI_ON_SCAN=false
```

**External reference search**

- **`REFERENCE_IMAGE_SEARCH_PROVIDER`** — `brave` or `off` (and related plumbing for other providers where implemented).
- **`BRAVE_SEARCH_API_KEY`** — required when Brave search is enabled.

**Supabase**

- URL + **service role** / anon keys must exist for **sync / admin** scripts; never paste keys into markdown or commit files holding live keys.

---

## F. What was built / fixed (timeline summary)

1. **Supabase table & upsert constraints** aligned with sync scripts (including conflict targets consistent with metadata model).
2. **Reference sync** handles **`strain_slug` + `content_hash`** collisions by **looking up the existing row** and **updating by id** (`duplicateRecovered` path in `scripts/sync-references-to-supabase.js`).
3. **Training sync** repaired and dedupe behavior documented in-script (`scripts/sync-training-images-to-supabase.js`).
4. **TheVault migration**: reference cache paths migrated off-repo to **`/Volumes/TheVault/StrainSpotter/...`** with tooling (`migrate-reference-cache-to-thevault.js`, storage checks).
5. **Local CLIP embedding path** via **`@xenova/transformers`** + **`clip-vit-base-patch32`** for offline-ish embedding workflows.
6. **OpenAI disabled / free mode** enforced in env + orchestration; incidental **`openaiUsed`** wiring typo fixed so telemetry matches reality.
7. **Scanner confidence / ranking** improvements:
   - embedding distance ranking
   - tie-break handling
   - boost for **trusted / user-confirmed** references
   - down-weight / caution for **`needs_review`** and variant-mismatch patterns where implemented
8. **Feedback reward system** (points / reputation JSONL + APIs).
9. **External image search**:
   - Google CSE path hit **403 project access** in practice → Brave route prioritized
   - **Brave** provider implemented
   - **SerpApi** placeholder/support where wired
10. **External review UI + APIs** under Garden data-engine (`/garden/data-engine/external-review`).
11. **Auto-review** for external candidates — auto-approve obvious matches, auto-reject obvious junk, leave uncertain rows for humans.
12. **Image lake pipeline** stitched into scripts / npm targets:
    - fetch → download → auto-review → quality → index → embeddings → Supabase sync
13. **Review queues** periodically drained — external human-review queues were **at zero** at last health snapshot (see §G).
14. **Build stabilized on Node 22** — production build uses **`next build --turbo`** (webpack path had flaked with opaque errors on this machine).
15. **Stripe routes + HEIC dependency**: Stripe API handlers **`dynamic import()`** the server Stripe helper so `next build` can run without `STRIPE_SECRET_KEY` during route collection; **`heic2any`** is installed for browser-side HEIC conversion in the scanner pipeline.

---

## G. Current known status (snapshot)

_Values drift after lake runs / embedding rebuilds / sync — re-run health commands below._

| Area | Last observed |
|------|----------------|
| **Build** | Passing (`npm run build`) |
| **OpenAI / free mode** | Off / free (`SCANNER_AI_PROVIDER=off`, etc.) |
| **Review queue** | `needs_human_review_external`: **0**, `needs_review_external_search`: **0** |
| **Supabase totals** | `supabaseScannerReferenceImagesTotal`: **~424**; `supabaseReferenceBucketRows`: **~359**; `supabaseRawBucketRows`: **~50**; `supabaseTrainingBucketRows`: **~15** |
| **Local references** | Enabled reference images (files present): **~374** |
| **Embeddings index** | Embedding records: **~341** |
| **Matchable + file** | Matchable downloaded + local file: **~341** |
| **Trusted confirmations** | `trusted_user_confirmed` references: **~15** |

---

## H. Important commands

### Node / install / build

```bash
node -v          # expect v22.x
npm install
npm run build
```

### Scanner dev (verbose matching)

```bash
SCANNER_DEBUG_MATCHING=true npm run dev
```

### Health

```bash
npm run scanner:health
npm run scanner:review-queue
npm run supabase:references:health
```

### Sync

```bash
npm run supabase:sync:references -- --limit 100
npm run supabase:sync:training
```

### Image lake (budgeted — **do not scrape uncapped**)

```bash
npm run scanner:image-lake -- \
  --fetch-new \
  --limit-strains 50 \
  --target-images 25 \
  --max-new-images 1000 \
  --confirm-search-cost \
  --sync-approved \
  --sync-raw
```

### Process existing queue (no new fetch)

```bash
npm run scanner:image-lake -- --sync-approved --sync-raw
```

### URLs

- External review UI: **http://localhost:3000/garden/data-engine/external-review**
- Data engine hub (placeholder / tooling entry): **http://localhost:3000/garden/data-engine**

---

## I. Next recommended work

- **Never scrape endlessly** — enforce `--max-new-images`, strain caps, and provider quotas.
- Continue collecting into **TheVault + raw Supabase bucket**, but keep matcher strict.
- Only **approved/trusted/matchable** rows should influence ranking.
- **Primary leverage**: more honest **user-confirmed scan feedback** per strain.
- **Priority strains** still hungry for trusted confirmations (popular coverage gaps):

  `granddaddy-purple`, `trainwreck`, `durban-poison`, `jack-herer`, `maui-wowie`, `jealousy`, `white-widow`, `green-crack`, `bruce-banner`, `girl-scout-cookies`

- Periodically **audit embedding coverage vs enabled references**.
- Stay on **Node 22**.
- **Finder duplicate files** (`foo 2.tsx`) — delete only when verified redundant.

---

## J. Warnings for Claude / future agents

1. **Never commit secrets** — scan staged files before `git commit`.
2. **Never commit TheVault images** or `data/strain-reference-images/cache/` blobs.
3. **Do not enable OpenAI by default** — preserve free/off posture unless explicitly requested.
4. **Do not lower quality gates** just to inflate counts.
5. **Never mark raw/pending/rejected lake rows as matchable** without human-approved promotion workflow.
6. On Supabase **duplicate key** errors for references — **use existing recovery / upsert-by-id path**; do **not** randomly drop uniqueness constraints.
7. Wrong repo warning: if Cursor/iTerm is rooted at **`Documents/henry-ai-desktop`** (or similar), that checkout may **not** be StrainSpotter Desktop canonical tree — confirm **`pwd`** matches **`/Users/christophercook/Desktop/strainspotter-web`** before editing/pushing.

---

_Last updated: handoff commit (“chore: stabilize StrainSpotter image lake and add Claude handoff”)._
