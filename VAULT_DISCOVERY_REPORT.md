# VAULT DISCOVERY REPORT
**Generated:** 2025-12-12  
**Mode:** Read-Only Discovery  
**Status:** ✅ Vault Found

---

## A) MOUNTED VOLUMES

| Volume | Size | Used | Type |
|--------|------|------|------|
| `/Volumes/TheVault` | 4.5TB | 2.1GB | External Drive |
| `/System/Volumes/Data` | 1.8TB | 267GB | System |
| `/System/Volumes/VM` | 1.8TB | 1.0GB | System |
| `/System/Volumes/Preboot` | 1.8TB | 7.6GB | System |

**Primary Candidate:** `/Volumes/TheVault` (4.5TB external drive)

---

## B) CANDIDATE VAULT VOLUMES

✅ **`/Volumes/TheVault`**
- **Size:** 4.5TB total, 2.1GB used
- **Type:** External drive
- **Mount Status:** ✅ Mounted and accessible
- **Contains StrainSpotter data:** ✅ YES

---

## C) STRAINSPOTTER-RELATED PATHS FOUND

### Primary Data Location
✅ **`/Volumes/TheVault/StrainSpotter-Dataset/`**
- **Size:** 84MB
- **Strain Directories:** 35,583
- **Structure:** Each strain has `buds/` and `packaging/` subdirectories

### Additional Resources
✅ **`/Volumes/TheVault/AI-Hero-Images/`**
- **Size:** 1.9GB
- **Total Images:** 1,230
- **Structure:** Contains hero images with metadata subdirectory

✅ **`/Volumes/TheVault/full_strains_35000.txt`**
- **Size:** 1.0MB
- **Strain Names:** 35,549 entries
- **Format:** `Strain Name|slug` (pipe-separated)

✅ **`/Volumes/TheVault/hero_state.json`**
- **Content:** `{"index": 906}`
- **Purpose:** Tracks hero image generation progress

---

## D) STRAINS DIRECTORY SUMMARY

### Counts
- **Total strain directories:** 35,583
- **Strains with `buds/` subdirectory:** 35,583 (100%)
- **Strains with `packaging/` subdirectory:** 35,583 (100%)
- **Total image files:** 1,006
- **Manifest files (`manifest.json`):** 0
- **Generated directories (`generated/`):** 0
- **Raw directories (`raw/`):** 0

### Structure Pattern
```
/Volumes/TheVault/StrainSpotter-Dataset/
├── <strain-slug>/
│   ├── buds/
│   └── packaging/
```

**Note:** This structure differs from the expected Vault structure which uses:
- `strains/<slug>/raw/`
- `strains/<slug>/generated/`
- `strains/<slug>/manifest.json`

---

## E) EXAMPLE STRAIN FOLDER STRUCTURE

**Example Strain:** ` Blessd` (first alphabetically)

**Path:** `/Volumes/TheVault/StrainSpotter-Dataset/ Blessd/`

**Structure:**
```
 Blessd/
├── buds/
└── packaging/
```

**Note:** Most strain directories appear to be empty or contain minimal files (only 1,006 total image files across 35,583 strains suggests most directories are placeholders).

---

## F) MANIFESTS / GENERATED DATA PRESENCE

### Manifests
- **`manifest.json` files found:** 0
- **Status:** No manifests exist in the current structure

### Generated/Synthetic Data
- **Strains with `generated/` directory:** 0
- **Status:** No generated data found

### Raw Data
- **Strains with `raw/` directory:** 0
- **Status:** No `raw/` directories found (data is in `buds/` and `packaging/` instead)

### Assessment
The current structure appears to be **raw scraped data** that has not yet been processed through the Vault pipeline. The data exists but:
- No manifests have been created
- No generated/synthetic images exist
- Structure uses `buds/` and `packaging/` instead of `raw/` and `generated/`

---

## G) INITIAL CONCLUSION: IS THE VAULT PRESENT AND USABLE?

### ✅ Vault IS Present
- **Location:** `/Volumes/TheVault`
- **Status:** Mounted and accessible
- **Data Exists:** 35,583+ strain directories

### ⚠️ Path Mismatch
- **Expected:** `/Volumes/Vault/strainspotter/`
- **Actual:** `/Volumes/TheVault/StrainSpotter-Dataset/`
- **Impact:** Code expects `/Volumes/Vault` but volume is mounted as `/Volumes/TheVault`

### ⚠️ Structure Mismatch
- **Expected Structure:**
  ```
  /Volumes/Vault/strainspotter/
  ├── strains/
  │   └── <slug>/
  │       ├── raw/
  │       ├── generated/
  │       └── manifest.json
  ├── datasets/
  └── logs/
  ```

- **Actual Structure:**
  ```
  /Volumes/TheVault/
  ├── StrainSpotter-Dataset/
  │   └── <slug>/
  │       ├── buds/
  │       └── packaging/
  ├── AI-Hero-Images/
  ├── full_strains_35000.txt
  └── hero_state.json
  ```

### ⚠️ Processing Status
- **Manifests:** None found (0/35,583)
- **Generated Data:** None found (0/35,583)
- **Assessment:** Data appears to be in **raw scraped state**, not yet processed

### ✅ Usability Assessment
**The Vault is present but requires configuration:**

1. **Path Configuration:** Update `VAULT_ROOT` environment variable or create symlink:
   - Option A: Set `VAULT_ROOT=/Volumes/TheVault/strainspotter` (if creating new structure)
   - Option B: Create symlink: `ln -s /Volumes/TheVault /Volumes/Vault`
   - Option C: Update code to use `/Volumes/TheVault/StrainSpotter-Dataset`

2. **Structure Migration:** The existing data uses `buds/` and `packaging/` structure. To use with the Vault system:
   - Either adapt the code to work with current structure
   - Or migrate data to expected structure (`strains/<slug>/raw/` and `generated/`)

3. **Processing Pipeline:** The data needs to be processed:
   - Generate manifests for each strain
   - Create generated/synthetic images
   - Build embeddings and datasets

### Recommendations
1. **Immediate:** Update `VAULT_ROOT` in `.env.local` to point to actual location
2. **Short-term:** Create adapter layer to map `buds/` → `raw/` and `packaging/` → processed data
3. **Long-term:** Run scraper/generator pipeline to populate manifests and generated data

---

## SUMMARY STATISTICS

| Metric | Value |
|--------|-------|
| Vault Volume | `/Volumes/TheVault` |
| Volume Size | 4.5TB (2.1GB used) |
| Strain Directories | 35,583 |
| Image Files | 1,006 |
| Hero Images | 1,230 |
| Manifest Files | 0 |
| Generated Directories | 0 |
| Structure Match | ❌ (uses `buds/`/`packaging/` not `raw/`/`generated/`) |
| Path Match | ❌ (uses `/Volumes/TheVault` not `/Volumes/Vault`) |

---

**Report Complete**  
*No files were modified during this discovery process.*
