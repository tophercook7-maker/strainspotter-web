# Reference Image Pipeline

StrainSpotter confidence is capped without reference images because OpenAI is
only used to extract visual traits. The scanner does not let OpenAI invent final
strain matches. Higher confidence requires local reference images and a local
comparison index.

Raw bud photos are inherently uncertain. One image per strain is not enough.
Market-quality scanner accuracy requires 10-25 verified, attributed local
reference images per priority strain; remote URLs or metadata alone are not
enough.

## First Test Set

Focus popular strains first. The focused list lives at:

```text
data/strain-reference-images/popular-strains.json
```

Start with a small, popular set:

- Blue Dream
- OG Kush
- Girl Scout Cookies
- Wedding Cake
- Gelato
- Gorilla Glue #4
- Sour Diesel
- Purple Punch
- Runtz
- Northern Lights

## Manual Sources

Add allowed source pages to:

```text
data/strain-reference-images/manual-sources.json
```

Each entry should include:

```json
{
  "strainName": "Blue Dream",
  "strainSlug": "blue-dream",
  "sourcePageUrl": "https://example.com/strain/blue-dream"
}
```

The collector reads OpenGraph images and normal `<img>` tags from those pages,
stores source attribution, and writes candidates to `reference-images.jsonl`.

For hard strains like Afghan Kush, use manually verified exact bud photo URLs.
Related variants, autos, crosses, and seed-pack images can hurt ranking more than
they help. Add 10-20 exact images with:

```bash
npm run references:add:exact -- --strain "Afghan Kush" --imageUrl "https://..." --sourcePageUrl "https://..." --notes "Exact Afghan Kush bud photo"
```

Then rebuild:

```bash
npm run references:download
npm run references:index
npm run references:embeddings
npm run references:audit:strain -- "Afghan Kush"
```

## Optional Search APIs

Search APIs are optional and disabled by default:

```text
REFERENCE_IMAGE_SEARCH_PROVIDER=off
GOOGLE_CUSTOM_SEARCH_API_KEY=
GOOGLE_CUSTOM_SEARCH_CX=
BING_IMAGE_SEARCH_API_KEY=
```

Set `REFERENCE_IMAGE_SEARCH_PROVIDER=google` or `bing` only after configuring
the matching API key. Search results still need source review and attribution.

## Commands

Seed candidates from StrainCompass `imageUrl` fields:

```bash
npm run references:seed:straincompass
```

Expand the focused popular strain set toward 10-25 images per strain:

```bash
npm run references:expand -- --target 10 --limit 50
npm run references:expand -- --strain "Blue Dream" --target 15 --limit 50
```

Collect candidates:

```bash
node scripts/collect-strain-reference-images.js --strain "Blue Dream" --limit 5
node scripts/collect-strain-reference-images.js --limit 25
node scripts/collect-strain-reference-images.js --strain "OG Kush" --download
```

Download/cache pending images:

```bash
npm run references:download
```

Audit the reference library:

```bash
npm run references:audit
```

Build the local feature index:

```bash
npm run references:index
```

Build the CLIP-compatible embedding index:

```bash
npm run references:embeddings
```

Small end-to-end batch:

```bash
npm run references:build
```

StrainCompass seed workflow:

```bash
npm run references:seed:straincompass
npm run references:download
npm run references:index
```

Focused expansion workflow:

```bash
npm run references:expand -- --target 10 --limit 50
npm run references:download
npm run references:index
npm run references:audit
```

## How Scanner Uses The Index

`data/strain-reference-images/reference-embedding-index.json` contains visual
embeddings when `npm run references:embeddings` succeeds. This is preferred over
the shallow fallback because 592 images is better than 1 image per strain, but
basic color histograms and average hashes are still not enough for reliable raw
bud identification.

`data/strain-reference-images/reference-index.json` contains shallow local
features for downloaded reference images. The fallback index is only trusted when
`localPath` points to an existing file in `data/strain-reference-images/cache/`.
The scanner compares an uploaded image against these indexes, groups matches by
strain, and combines:

- Exact or close detected label text
- Visual embedding similarity when available
- Reference image similarity
- OpenAI extracted possible type
- Local strain metadata

If no index exists, scanner responses include:

```text
Scanner is running visual-trait mode only. Build reference image index to improve confidence.
```

and confidence remains capped.

Use `npm run references:audit` after seeding, downloading, and indexing. A good
library should show existing local files and at least 3 reference images for
important strains before trusting visual-only matches. For market-leading
accuracy, push the top strains toward 10-25 usable local images.

User feedback confirmations from `/api/scan/feedback` become training labels for
future reference curation and model evaluation. Confirmed `noneOfThese` results
are also useful because they identify weak or overbroad matches.

Scanner confidence should stay honest: visual-only matches can improve with
embeddings and confirmed feedback, but raw bud identification remains uncertain
without label text, lab data, or known grow context.

## Legal And Source Notes

Respect robots.txt and source terms where practical. Do not scrape behind logins.
Store `sourcePageUrl`, `imageUrl`, and license notes for every image. Do not
hotlink production images unless the source allows it; use local dev cache and
attribution instead.

## Cost Warning

The default index builder uses a local byte histogram and average hash fallback.
If future work enables OpenAI analysis of many reference images, estimate cost
first, use small batches, and monitor the OpenAI dashboard by project, key, and
model.
