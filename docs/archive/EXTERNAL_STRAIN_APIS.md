# External Strain APIs

StrainSpotter uses external strain metadata as enrichment only. External APIs can
help rank or explain matches when label text is visible, but they do not replace
local matching and they do not make raw bud-photo visual ID reliable by
themselves.

## StrainCompass

StrainCompass is the primary external enrichment provider because local iTerm
tests confirmed that its public endpoints return `imageUrl` fields alongside
strain metadata:

```text
https://straincompass.com/api/strains/search?q=blue%20dream
https://straincompass.com/api/strains?q=blue%20dream&limit=1
```

The search response includes fields like `slug`, `name`, `type`, `thcMax`, and
`imageUrl`. The detailed endpoint can also include `effects`, `flavors`,
`terpenes`, `sources`, `description`, `lineage`, `breeder`, `thcMin/thcMax`, and
`cbdMin/cbdMax`.

No API key is required for the tested endpoints, but authenticated TerpScout /
StrainCompass access is supported server-side. Configure it with:

```bash
npm run setup:straincompass
```

The setup stores `STRAINCOMPASS_API_KEY` in `env/.env.local` and keeps
`STRAINCOMPASS_BASE_URL` at `https://straincompass.com/api`. `TERPSCOUT_API_KEY`
is also supported as an alias. Do not use public prefixes such as
`NEXT_PUBLIC_`, `VITE_`, `EXPO_PUBLIC_`, or `REACT_APP_` for this key.

The provider adds `Authorization: Bearer <key>` and `x-api-key: <key>` headers
only when a key is configured. It never logs or returns the key. It normalizes
`imageUrl` into scanner evidence and reference-image seed data.

## BudProfiles

BudProfiles is the secondary metadata provider. iTerm tests showed that the API
works, but sampled responses did not appear to return image fields.

```text
https://budprofiles.com/api/v1
```

BudProfiles enriches names, types, THC/CBD-style fields, effects, flavors, and
lineage-like metadata when available. `imageUrl` remains `null` unless
BudProfiles later adds image-like fields such as `image`, `image_url`,
`thumbnail`, `photos`, or `images`.

BudProfiles results are only accepted when the normalized result name is strongly
similar to the scanner query. This prevents irrelevant responses, such as
`#167B Auto` for unrelated searches, from becoming primary matches.

## Leafly

Leafly generally requires partner or POS API access. Do not scrape private or
logged-in surfaces. Add Leafly only through an approved API or licensed data
relationship.

## Caching

External metadata is cached locally for 7 days in:

```text
data/external-strain-cache/
```

Cache files are keyed by provider and query slug. They should not contain API
keys.

## Scanner Ranking

Scanner matching combines:

- Local `lib/data/strains.json`
- Detected label text
- OpenAI visual traits
- External metadata from enabled providers
- Visual embeddings from `reference-embedding-index.json`, when available
- Reference image index, when available

StrainCompass candidates with `imageUrl` can raise confidence above the
visual-trait-only cap only when detected text strongly matches the candidate, a
fuzzy text match agrees with local metadata, or verified local reference images
support the match. Metadata APIs alone do not solve raw bud identification.

## High Confidence Still Needs Images

Raw bud photos are inherently uncertain. The 592-image reference set is better
than a one-image-per-strain library, but color/hash matching is not enough for
market-quality identification. Stronger visual matching needs
`data/strain-reference-images/reference-embedding-index.json` plus confirmed user
feedback labels. Use `npm run references:audit` to verify the image library
before relying on the scanner. Production use should respect image usage rights,
source terms, and attribution requirements before redistribution.

Test providers:

```bash
npm run strain:providers:test
```
