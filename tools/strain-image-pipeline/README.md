# Strain Image Pipeline

End-to-end pipeline for strain reference image ingestion: fetch → extract → download → classify → quality → dedupe → promote → review queue.

## Quick Start (Small Test Batch)

Run the pipeline in **fixture mode** (no live HTTP requests) with a small batch of 5 strains:

```bash
cd tools/strain-image-pipeline
npm run run fixtures/test-batch.txt
```

Or use the default batch (same 5 strains) when no Vault strain list is found:

```bash
USE_FIXTURE=1 npm run run
```

Fixture mode reads HTML from `fixtures/*.html` and extracts image URLs. Images are downloaded from those URLs (picsum.photos placeholders). Note: placeholder images may be rejected by the quality check (blur threshold); the pipeline flow still runs end-to-end.

## Test Mode: Fixture vs Live

- **Fixture mode** (default): Reads from `fixtures/{strain}.html`, no live page fetch. Safe for CI and local testing.
- **Live mode**: Set `USE_FIXTURE=0` and provide source URLs via the source queue. Uses throttling and user-agent.

## Outputs (Vault Structure)

Outputs are written under `VAULT_ROOT`. Default: `/Volumes/TheVault/strainspotter-vault` or `/Volumes/Vault/strainspotter-vault`. If neither volume exists, falls back to `./vault-output`.

| Path | Description |
|------|-------------|
| `raw_sources/html/` | Raw HTML (or fixture copies) per strain |
| `raw_sources/images/{strain}/` | Downloaded images before quality/dedupe |
| `raw_sources/rejected/` | Images rejected by quality check |
| `staging/candidate_strain_images/{strain}/` | Promoted candidates |
| `review_queue/images/` | Copies for human review |
| `review_queue/manifest.json` | Review queue manifest |
| `logs/` | Run logs and manifests |

## Inspecting Results

- **Run log**: `{VAULT_ROOT}/logs/run_{runId}.log`
- **Manifest**: `{VAULT_ROOT}/logs/manifest_{runId}.json` — summarizes strains, pages fetched, URLs extracted, downloaded, rejected, promoted
- **Review manifest**: `{VAULT_ROOT}/review_queue/manifest.json`

## Environment

- `VAULT_ROOT` — Override output root
- `USE_FIXTURE` — `1` (default) or `0` for live fetch
- `STRAIN_LIST` — Path to strain list file (one strain per line)
