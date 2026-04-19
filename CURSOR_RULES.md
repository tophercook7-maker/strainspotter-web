---
SYSTEM RULES FOR THIS REPO

1. Cursor may modify AT MOST 3 files per task
2. Cursor may NOT refactor, rename, or delete scanner logic
3. Scanner core is STABLE:
   - lib/scanner/runMultiScan.ts
   - lib/scanner/nameFirst*
   - lib/scanner/ratio*
4. UI must ONLY read from ScannerViewModel
5. Scanner must ALWAYS return:
   - name (never empty)
   - confidence (number)
6. No throws allowed in scan path
7. If unsure → STOP and ask
---
