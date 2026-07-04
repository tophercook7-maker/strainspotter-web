# External reference review workflow

StrainCompass and other **exact API** matches can be promoted with higher trust. Rows from **Brave / SerpApi / Google Custom Search** are **low trust by default**: they are stored with `reviewStatus: needs_review_external_search` until a human verifies the image matches the strain.

Supabase sync **does not upload** `needs_review_external_search` rows. After you approve, the row must still be **downloaded**, have a **content hash**, and pass the normal sync filters.

## Review in HTML

Generate a report and gallery (open the file in a browser):

```bash
npm run references:review:external
open data/strain-reference-images/review/external-candidates.html
```

The summary includes counts, per-strain tallies, top domains, and invalid URLs.

## Approve or reject one image (by `imageUrl`)

**Approve** (enables the row for the pipeline; sets `reviewStatus` to `approved_external_exact`, `trustLevel` to `medium`, clears `disabledReason`; keeps `status: downloaded` if a local file exists, otherwise `pending`):

```bash
npm run references:review:set -- --imageUrl "https://..." --approve --reason "Exact bud photo"
```

**Reject** (disables and skips):

```bash
npm run references:review:set -- --imageUrl "https://..." --reject --reason "Wrong strain / variant / marketing"
```

After approvals for rows still `pending`, run downloads and rebuild indices:

```bash
npm run references:download
npm run references:quality
npm run references:index
npm run references:embeddings
```

## Sync approved rows to Supabase

Only rows that are **not** `needs_review_external_search`, have **external** source approval via `approved_external_exact` when `sourceName` is `brave-search` / `serpapi` / `google-custom-search`, are **enabled**, **`downloaded`**, have **`localPath`** and **`contentHash`**, and pass placeholder checks are eligible.

```bash
npm run supabase:sync:references -- --limit 100
```

Do not rely on `--include-needs-review` to push unapproved external URLs; those rows stay blocked.

## Health report

```bash
npm run scanner:health
```

Look for **External search review / promotion**: pending counts, approved/rejected totals, and top strains still awaiting review.

## Related

- `SCANNER_EXTERNAL_IMAGE_SEARCH_PROVIDERS.md` — provider setup and cost guards.
- `SCANNER_GOOGLE_IMAGE_SEARCH_COSTS.md` — Google CSE specifics.
