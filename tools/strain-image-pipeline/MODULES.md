# Pipeline Module Plan

Modules and their responsibilities. ✅ = implemented; ⬜ = scaffolded/planned.

---

## 1. Source Queue Input

**Purpose:** Manage strain list and source URLs for ingestion.  
**Status:** ⬜ Scaffolded  
**File:** `source_queue.ts`  
**Inputs:** Strain list file, config  
**Outputs:** Queue of { strain, source_url? } for processing  

---

## 2. Page Fetch

**Purpose:** Fetch HTML/JSON pages with respect for robots.txt and rate limits.  
**Status:** ⬜ Scaffolded  
**File:** `page_fetch.ts`  
**Inputs:** URL, options (delay, user-agent)  
**Outputs:** Raw HTML/JSON to `raw_sources/html/` or `raw_sources/json/`  

---

## 3. Metadata Extraction

**Purpose:** Extract strain metadata from raw HTML/JSON.  
**Status:** ⬜ Scaffolded  
**File:** `metadata_extraction.ts`  
**Inputs:** Raw content  
**Outputs:** Structured metadata → `staging/strain_source_records/`  

---

## 4. Image URL Extraction

**Purpose:** Extract image URLs from pages or metadata.  
**Status:** ⬜ Scaffolded  
**File:** `image_url_extraction.ts`  
**Inputs:** Raw content, metadata  
**Outputs:** List of image URLs per strain  

---

## 5. Image Download

**Purpose:** Download images to raw_sources/images/{strain}/.  
**Status:** ✅ Implemented  
**File:** `download_images.ts`  

---

## 6. Image Classification

**Purpose:** Classify bud / whole_plant / leaf / trichome / packaging.  
**Status:** ✅ Implemented (heuristic; extend with AI)  
**File:** `image_classifier.ts`  

---

## 7. Quality Scoring

**Purpose:** Score and filter blur, resolution, brightness, watermark.  
**Status:** ✅ Implemented  
**File:** `image_quality_check.ts`  

---

## 8. Duplicate Detection

**Purpose:** Remove near-duplicates via perceptual hashing.  
**Status:** ✅ Implemented  
**File:** `image_dedupe.ts`  

---

## 9. Review Queue Output

**Purpose:** Write candidate images and metadata to review_queue for human approval.  
**Status:** ⬜ Scaffolded  
**File:** `review_queue_output.ts`  
**Outputs:** `review_queue/images/` with metadata  

---

## 10. Promotion to Approved

**Purpose:** Move approved images to approved/strain_reference_images/{type}/.  
**Status:** ✅ Implemented (promote.ts; extend for approved path)  
**File:** `promote.ts`  
