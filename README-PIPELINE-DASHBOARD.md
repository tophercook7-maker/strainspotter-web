# Pipeline Dashboard

This repository publishes a daily history of the strain data pipeline and a lightweight dashboard you can view in your browser.

- Data file: `reports/pipeline-history.json` (auto-updated by GitHub Actions)
- Dashboard UI: `docs/pipeline.html` (reads the JSON from the default branch)

## How it works

1. The workflow `.github/workflows/strain-pipeline.yml` runs nightly at 03:00 UTC.
2. It executes `tools/full_pipeline.mjs` to scrape, enhance, and import strains.
3. After completion, it runs `scripts/update_pipeline_history.mjs` which collects:
   - Strain counts from `backend/data/strain_library_enhanced.json` and `backend/data/strain_library.json`
   - The `backend/data/import_report.json` summary
4. The workflow commits `reports/pipeline-history.json` back to `main` if it changed.
5. The dashboard `docs/pipeline.html` renders a live chart from the history JSON.

## View the dashboard

- If GitHub Pages is enabled for this repo, visit:
  - https://<your-username>.github.io/StrainSpotter/pipeline.html
- Alternatively, open `docs/pipeline.html` directly in your browser; it will fetch `reports/pipeline-history.json` from the `main` branch via raw.githubusercontent.com.

## Troubleshooting

- If the history file is missing, run locally:
  ```sh
  node scripts/update_pipeline_history.mjs
  ```
- Ensure the workflow has permission to push back to `main`. The default `GITHUB_TOKEN` typically does.
- The chart uses Chart.js via CDN; restrict outbound connections if needed and vendor the file.
