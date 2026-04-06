# Phase 1 Cleanup Execution Plan

This branch was created to hold the first repo cleanup pass.

Planned priorities:
1. Delete duplicate files with numbered suffixes.
2. Remove dead root markdown reports and one-off fix notes.
3. Remove junk state/log files from the repo root.
4. Tighten `.gitignore` for generated and oversized data.
5. Audit and then trim `lib/scanner/` dead code in a second pass.

Reason for phased approach:
- The scanner folder has many legacy files and some type-only imports.
- A safe destructive pass should verify exact paths before mass deletion.
- The root/doc/junk cleanup is straightforward and should happen before scanner surgery.
