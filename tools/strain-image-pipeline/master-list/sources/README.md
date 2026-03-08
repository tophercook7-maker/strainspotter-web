# Bulk Source Files

Drop raw strain-name files here before running bulk import. Organize by source/vendor:

- `leafly/` — Leafly or similar
- `wiki/` — Wikipedia or strain wikis
- `vendor_name/` — add subfolders per source

Supported formats: `.txt` (one per line), `.csv` (name/strain column), `.json` (array).

Then run:
```bash
npm run master-list:bulk-import
```
