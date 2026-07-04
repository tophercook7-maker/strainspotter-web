# Scanner data engine automation

The `scanner:data-engine` script runs the full local pipeline so external candidates keep flowing, **auto-review** triages obvious rows, and **uncertain** items pile up in the external review UI for occasional human passes. Optional **Supabase** sync runs at the end when you opt in.

## Manual safe commands

**Process the existing queue** (download, auto-review, quality, index, embeddings, health — no new external fetch):

```bash
npm run scanner:data-engine -- --no-fetch --sync-supabase
```

**Fetch new candidates with caps and cost confirmation** (when `REFERENCE_IMAGE_SEARCH_PROVIDER` is a paid provider such as Brave, Google, or SerpApi):

```bash
npm run scanner:data-engine -- --fetch-new --limit-strains 25 --target-images 10 --max-new-images 200 --confirm-search-cost --sync-supabase
```

**Human review queue snapshot**:

```bash
npm run scanner:review-queue
```

**Open the external review UI**:

http://localhost:3000/garden/data-engine/external-review

## Daily habit

If you mostly want “append new search hits, triage, sync”, run **with** `--fetch-new` and `--confirm-search-cost` when using a paid provider. If you only want to chew through the backlog after hand-approving in the UI:

```bash
npm run scanner:data-engine -- --no-fetch --sync-supabase
```

## Flags (data engine)

| Flag | Meaning |
|------|--------|
| `--fetch-new` | Run `scanner:fill` (external provider + caps) before the rest. |
| `--no-fetch` | Never run `scanner:fill`, even if `--fetch-new` is set. |
| `--review-only` | Only `references:auto-review:external`; prints queue summary; no download. |
| `--dry-run` | `scanner:fill --dry-run`, `references:auto-review:external --dry-run`; skips download/index/embeddings/sync. |
| `--sync-supabase` | After embeddings: `supabase:sync:references`, `supabase:sync:training`, `supabase:references:health`. |
| `--confirm-search-cost` | Required for **non–dry-run** `--fetch-new` when a paid external provider is configured. |
| `--limit-strains`, `--target-images`, `--max-new-images` | Forwarded to `scanner:fill`. |
| `--once` | Single pass (default); reserved for docs / future scheduling. |

**OpenAI** is not used by this orchestrator (`SCANNER_BUILD_REFERENCE_WITH_OPENAI=false` for child steps). Embeddings use the local Xenova pipeline.

Each run writes **report**: `data/scanner-training/data-engine-run-report.json`.

## Scheduling (optional)

This repo does **not** install launchd jobs or cron for you. On macOS you can use **launchd** with a `ProgramArguments` plist that `cd`s to the repo and runs e.g.:

```bash
/usr/bin/env npm run scanner:data-engine -- --no-fetch --sync-supabase
```

Use a fixed `PATH` and the same Node version you use for development (e.g. Node 22). Test the command manually first; watch logs for non-zero exits.

On Linux, the same command can go in **cron**; prefer wrapping it in a script that loads `env/.env.local` if needed (the data-engine script already loads `env/.env.local` for provider keys).

## Trust and workflow

- **Automation** downloads and **auto-review** labels obvious accepts/rejects; **uncertain** rows stay on `needs_human_review_external` for the UI.
- You only need to **review the uncertain pile** in small batches (filters: needs human, pending external, approved, rejected, all).
- After you approve, the next **data-engine** run (without needing a long chain of separate commands) downloads/indexes/embeds and can **sync** to Supabase when `--sync-supabase` is set.
- **External / auto-approved** references stay **low or medium trust** until humans confirm exact approvals; **user-confirmed scans** promoted into references remain the **highest trust** path for the scanner.
