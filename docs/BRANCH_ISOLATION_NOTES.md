# Branch Isolation Notes

## Current branches

- **feature/reference-image-pipeline** — Reference image pipeline only. Clean working tree. Ready for PR.
- **slim-app-cleanup** — Slim-app work (plants, dispensaries removed; activity, grow-coach added) + full lib/, docs/, migrations. Preserves all unrelated work.

## Preserved work

Unrelated slim-app changes were moved to `slim-app-cleanup` and committed there. Nothing was discarded.

To restore slim-app work:
```bash
git checkout slim-app-cleanup
```

## Merge order

If merging both features:
1. Merge `feature/reference-image-pipeline` first (reference image pipeline).
2. Merge `slim-app-cleanup` (or rebase it onto the result) for the full slim app + lib.

Note: `feature/reference-image-pipeline` builds only when lib/ (scanner, garden, etc.) is present. Those are included in `slim-app-cleanup`. For CI/build, ensure the merge base or target includes lib/.
