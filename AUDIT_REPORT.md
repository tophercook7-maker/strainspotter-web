# SCANNER SYSTEM AUDIT REPORT
**Date:** 2024-12-19  
**Phase:** Full System Verification  
**Status:** AUDIT ONLY - NO FIXES

---

## AUDIT A — INGEST & INPUT
**Status:** ⚠️ **PARTIAL PASS** (Issues Found)

### Files Checked
- ✅ `app/garden/scanner/page.tsx` (Lines 19-311)
- ✅ Image upload handler (Lines 157-172)
- ✅ Multi-image intake logic (Lines 20-25, 35-71)

### Findings

#### ✅ PASS: Images Stored in State
- **Line 20:** `const [images, setImages] = useState<File[]>([]);`
- **Line 163-169:** File input correctly updates state
- **Status:** Images are stored in state ✓

#### ✅ PASS: Image Order Preserved
- **Line 183:** `images.map((img, idx) => ...)` - Order preserved via array index
- **Status:** Order maintained ✓

#### ✅ PASS: Image Labels Applied
- **Line 179:** `assignUserImageLabels(images.length)` called
- **Line 185:** Labels correctly assigned per image
- **Status:** Labels working ✓

#### ⚠️ ISSUE: Scan Button Click Target Size
- **Line 254:** `min-h-[56px]` - Button height is 56px (PASS - exceeds 44px requirement)
- **Line 252:** `w-full` - Full width button (PASS)
- **Status:** Button size adequate ✓

#### ✅ PASS: Scan Button Always Clickable
- **Line 247:** `disabled={images.length === 0 || isScanning}`
- Button disabled only when no images OR scanning
- **Status:** Logic correct ✓

#### ✅ PASS: runScan() Fires Every Click
- **Line 79:** `async function handleAnalyzePlant()`
- **Line 81:** `console.log("ANALYZE CLICKED")` - Log present
- **Line 119:** `await scanImages(images)` - Function called
- **Status:** Handler fires correctly ✓

#### ✅ PASS: No Silent Returns
- **Line 85-99:** Validation returns with alerts/confirms
- **Line 125-127:** Error handling with console.error and alert
- **Status:** Errors surfaced ✓

#### ⚠️ ISSUE: Missing Required Logs
- **Line 81:** ✅ `console.log("ANALYZE CLICKED")` - Present
- **Line 110:** ✅ `console.log("IMAGE COUNT:", images.length)` - Present
- **Line 111:** ✅ `console.log("ANALYZING", images.length, "IMAGES")` - Present
- **Status:** Required logs present ✓

### Summary
- **PASS:** 7/7 core requirements
- **ISSUES:** 0 critical
- **RECOMMENDATION:** All requirements met

---

## AUDIT B — runScan PIPELINE
**Status:** ⚠️ **PARTIAL PASS** (Issues Found)

### Files Checked
- ✅ `lib/scanner/runMultiScan.ts` (Lines 73-1402)
- ✅ `lib/scanner/imageAnalysis.ts` (Lines 19-207)
- ✅ `lib/scanner/wikiEngine.ts` (Lines 22-301)

### Findings

#### ✅ PASS: Pipeline Order
1. **Images → Per-image analysis:** ✅ Line 132 `analyzePerImageV3(imageFiles, input.imageCount)`
2. **Per-image → WikiResult[]:** ✅ Line 87-101 `wikiResults = await Promise.all(...)`
3. **WikiResult[] → Consensus:** ✅ Line 160 `buildConsensusResultV3(imageResultsV3, ...)`
4. **Consensus → ViewModel:** ✅ Line 413 `wikiToViewModel(finalWiki, ...)`
5. **ViewModel → UI:** ✅ Lines 122-123 `setResult(scanResult.result)`
- **Status:** Order correct ✓

#### ⚠️ ISSUE: Missing Required Logs
- **Per-image results length:** ❌ NOT LOGGED (should log `imageResultsV3.length`)
- **Candidate strain names per image:** ❌ NOT LOGGED (should log per-image candidates)
- **Consensus primary strain:** ✅ Line 161 `console.log("CONSENSUS RESULT V3:", consensusResult)`
- **Confidence %:** ✅ Line 161 (included in consensus log)
- **Indica/Sativa scores:** ❌ NOT LOGGED (should log ratio results)

**Required Logs Missing:**
- Line 133: Should add `console.log("PER-IMAGE RESULTS COUNT:", imageResultsV3.length)`
- Line 133: Should add `console.log("CANDIDATE STRAINS PER IMAGE:", imageResultsV3.map(r => r.candidateStrains.map(c => c.name)))`
- Line 428: Should add `console.log("INDICA/SATIVA SCORES:", strainRatio.indicaPercent, strainRatio.sativaPercent)`

#### ✅ PASS: No Undefined Returns
- **Line 152-156:** Try/catch wraps name-first pipeline
- **Line 266-303:** Fallback logic ensures primaryMatch always set
- **Line 413:** ViewModel always returned
- **Status:** No undefined returns ✓

#### ⚠️ ISSUE: Potential join() on Undefined Arrays
- **Line 192:** `nameFirstPipelineResult.explanation.whyThisNameWon.join(". ")` - Could fail if `whyThisNameWon` is undefined
- **Line 205:** Same issue
- **Line 404:** `candidatePool[0].matchedTraits.slice(0, 4).join(", ")` - Safe (slice returns array)
- **Status:** Potential undefined join() calls ⚠️

#### ✅ PASS: Try/Catch Error Handling
- **Line 125-127:** Error caught and surfaced
- **Line 143-156:** Name-first pipeline wrapped in try/catch
- **Line 874-877:** V80 engine wrapped in try/catch
- **Status:** Errors handled ✓

### Summary
- **PASS:** 4/6 core requirements
- **ISSUES:** 2 (missing logs, potential undefined joins)
- **RECOMMENDATION:** Add missing logs, add null checks before join()

---

## AUDIT C — CONSENSUS ENGINE
**Status:** ✅ **PASS** (Minor Issues)

### Files Checked
- ✅ `lib/scanner/consensusEngine.ts` (Lines 147-395)
- ✅ `lib/scanner/perImageFindings.ts` (Lines 24-114)
- ✅ `lib/scanner/confidenceTier.ts` (Lines 38-86)

### Findings

#### ✅ PASS: 2-5 Images Supported
- **Line 81-95:** `analyzePerImageV3` accepts any number of images
- **Line 147-151:** `buildConsensusResultV3` accepts `imageCount` parameter
- **Line 307-324:** Image count-specific confidence caps (1, 2, 3+)
- **Status:** Supports 1-5 images ✓

#### ✅ PASS: Agreement Bonus Applied
- **Line 211-215:** `if (data.appearances >= 2) { agreementBonus = (data.appearances - 1) * 15; }`
- **Line 229-233:** Type diversity bonus applied
- **Status:** Bonuses working ✓

#### ✅ PASS: Outliers Penalized
- **Line 217-221:** One-off matches penalized (-10%)
- **Line 236-237:** Variance penalty calculated
- **Status:** Penalties applied ✓

#### ✅ PASS: Max Caps Enforced
- **Line 258:** `Math.max(80, Math.min(99, score))` - 80-99% range
- **Line 307-324:** Image-count specific caps (1 image: 92%, 2 images: 96%, 3+: 99%)
- **Line 362:** `maxAllowed` variable enforces caps
- **Status:** Caps enforced ✓

#### ✅ PASS: Never Returns Empty Primary Match
- **Line 266-289:** Fallback logic ensures primaryMatch always set
- **Line 292-303:** Additional check prevents "Unknown" names
- **Status:** Always returns primary match ✓

#### ✅ PASS: Required Fields Always Present
- **Line 256-260:** `primaryMatch` object always created with `name`, `confidence`, `reason`
- **Line 375-394:** Return object includes all required fields
- **Status:** Required fields present ✓

### Summary
- **PASS:** 6/6 core requirements
- **ISSUES:** 0
- **RECOMMENDATION:** No changes needed

---

## AUDIT D — STRAIN DATABASE
**Status:** ❌ **FAIL** (Critical Issue)

### Files Checked
- ✅ `lib/scanner/cultivarLibrary.ts` (Lines 33-409)
- ✅ `lib/scanner/nameFirstMatcher.ts` (Referenced)
- ✅ `lib/scanner/databaseFilter.ts` (Referenced)

### Findings

#### ❌ CRITICAL: Database Size Mismatch
- **Claimed:** 35,000 strains
- **Actual:** ~12-15 strains in `CULTIVAR_LIBRARY` array
- **Line 33-409:** Array contains only ~12 entries (Northern Lights, Blue Dream, OG Kush, etc.)
- **Status:** Database is NOT 35,000 strains ❌

#### ✅ PASS: Name Matching Before Image Similarity
- **Line 268-272:** `CULTIVAR_LIBRARY.find(s => s.name === lockedStrainName || s.aliases?.includes(lockedStrainName))`
- Database lookup happens before image analysis
- **Status:** Order correct ✓

#### ✅ PASS: Synonyms Resolved
- **Line 15:** `aliases: string[]` field in CultivarReference
- **Line 268-272:** Aliases checked in lookup
- **Status:** Synonyms working ✓

#### ✅ PASS: Duplicate Names Disambiguated
- **Line 88-93:** `variantGrouping.ts` groups variants by root name
- **Line 585-878:** Name-first pipeline includes disambiguation logic
- **Status:** Disambiguation present ✓

#### ✅ PASS: Closest Match Always Returned
- **Line 96-137:** `buildStrainCandidatePool` returns top 5 candidates
- **Line 266-289:** Fallback ensures match always returned
- **Status:** Match always returned ✓

#### ❌ ISSUE: Missing DB Size Log
- **Required:** `console.log("DB size on boot:", CULTIVAR_LIBRARY.length)`
- **Status:** Not logged ❌

#### ❌ ISSUE: Missing Top 5 Candidates Log
- **Required:** `console.log("Top 5 name candidates:", candidatePool.slice(0, 5).map(c => c.name))`
- **Line 381:** `console.log("CANDIDATE POOL (Top 5):", candidatePool)` - Present but not formatted
- **Status:** Partially logged ⚠️

### Summary
- **PASS:** 4/7 core requirements
- **ISSUES:** 3 (critical: DB size mismatch, missing logs)
- **RECOMMENDATION:** 
  - **CRITICAL:** Fix database size claim or load actual 35K database
  - Add DB size log on boot
  - Format candidate log better

---

## AUDIT E — VIEW MODEL LOCK
**Status:** ✅ **PASS** (Minor Issues)

### Files Checked
- ✅ `lib/scanner/viewModel.ts` (Lines 11-317)
- ✅ `lib/scanner/wikiAdapter.ts` (Lines 14-274)
- ✅ `app/garden/scanner/page.tsx` (Lines 21-22)

### Findings

#### ✅ PASS: UI Touches ONLY ViewModel
- **Line 21:** `const [result, setResult] = useState<ScannerViewModel | null>(null);`
- **Line 122:** `setResult(scanResult.result)` - Only ViewModel set
- **Line 301-307:** UI renders `result` (ViewModel type)
- **Status:** UI isolated to ViewModel ✓

#### ✅ PASS: No WikiResult Leaks
- **Line 22:** `const [synthesis, setSynthesis] = useState<WikiSynthesis | null>(null);`
- Synthesis is separate from ViewModel
- **Line 301-307:** Only ViewModel rendered, WikiSynthesis not used in main UI
- **Status:** No leaks ✓

#### ✅ PASS: Required Fields Always Present
- **Line 34-40:** `wikiAdapter.ts` ensures `primaryName` always set (fallback to "Hybrid Cultivar")
- **Line 42-47:** `confidenceRange` always created
- **Line 144:** `name: primaryName` - Always present
- **Status:** Required fields present ✓

#### ✅ PASS: displayName Field
- **Line 13:** `name: string;` in ViewModel
- **Line 144:** Always set in adapter
- **Status:** Present ✓

#### ✅ PASS: confidence Field
- **Line 15-19:** `confidenceRange: { min, max, explanation }`
- **Line 48:** `confidence: number` (legacy)
- **Status:** Present ✓

#### ✅ PASS: confidenceTier Field
- **Line 106-110:** `confidenceTier?: { tier, label, description }`
- **Line 388-392:** Set in runMultiScan
- **Status:** Present ✓

#### ✅ PASS: indicaPercent/sativaPercent Fields
- **Line 151-162:** `ratio?: { indicaPercent, sativaPercent, ... }`
- **Line 1103-1166:** Set in nameFirstDisplay
- **Status:** Present ✓

#### ✅ PASS: summaryBlocks Field
- **Line 149-155:** Deep analysis sections (visualMatchSummary, flowerStructureAnalysis, etc.)
- **Status:** Present ✓

### Summary
- **PASS:** 8/8 core requirements
- **ISSUES:** 0
- **RECOMMENDATION:** No changes needed

---

## AUDIT F — UI RENDERING
**Status:** ⚠️ **PARTIAL PASS** (Issues Found)

### Files Checked
- ✅ `app/garden/scanner/ResultPanel.tsx` (Lines 11-181)
- ✅ `app/garden/scanner/WikiPanel.tsx` (Lines 13-160)
- ✅ `app/garden/scanner/WikiStyleResultPanel.tsx` (Lines 14-1383)
- ✅ `app/garden/scanner/WikiReportPanel.tsx` (Lines 14-908)

### Findings

#### ✅ PASS: Result Renders When ViewModel != null
- **Line 301:** `{result && result.wikiReport && (`
- **Line 304:** `{result && !result.wikiReport && (`
- **Status:** Conditional rendering correct ✓

#### ✅ PASS: WikiPanel Renders When synthesis != null
- **Line 22:** `synthesis: WikiSynthesis` prop
- **Line 13:** Component receives synthesis
- **Status:** Rendering correct ✓

#### ⚠️ ISSUE: Conditional Hiding Results
- **Line 301-307:** Results only render if `result` exists
- This is correct behavior, but audit asks to verify no over-hiding
- **Status:** Conditional is appropriate ✓

#### ✅ PASS: Max-Width Applied
- **Line 153:** `max-w-xl md:max-w-2xl mx-auto` (page.tsx)
- **Line 62:** `max-w-4xl mx-auto` (WikiStyleResultPanel)
- **Line 36:** `max-w-4xl mx-auto` (WikiReportPanel)
- **Status:** Max-widths applied ✓

#### ✅ PASS: Horizontal Rules Do NOT Span Full Viewport
- **Line 65:** `border-b border-white/10` (contained within max-w container)
- **Line 179:** `border-t border-white/10` (contained)
- All borders are within max-width containers
- **Status:** Rules contained ✓

### Summary
- **PASS:** 5/5 core requirements
- **ISSUES:** 0
- **RECOMMENDATION:** No changes needed

---

## AUDIT G — MOBILE
**Status:** ⚠️ **PARTIAL PASS** (Issues Found)

### Files Checked
- ✅ `app/garden/scanner/page.tsx` (Lines 148-310)
- ✅ Button sizing and positioning
- ✅ Scroll behavior

### Findings

#### ✅ PASS: Tap Targets ≥ 44px
- **Line 254:** `min-h-[56px]` - Button height 56px (exceeds 44px)
- **Line 206-211:** Remove image button (small, but not primary action)
- **Status:** Primary targets adequate ✓

#### ✅ PASS: Buttons Centered
- **Line 231:** `flex flex-col items-center` - Button container centered
- **Line 245-263:** Button uses `w-full` but container is centered
- **Status:** Centered ✓

#### ⚠️ ISSUE: Remove Image Button Size
- **Line 206-211:** Remove button (`×`) may be < 44px
- **Line 208:** `px-2 py-1` - Likely ~32px height
- **Status:** Secondary button too small ⚠️

#### ✅ PASS: Scroll Works
- **Line 18:** `max-h-[80vh] overflow-y-auto` (ResultPanel)
- **Line 62:** `max-h-[85vh] overflow-y-auto` (WikiStyleResultPanel)
- **Status:** Scroll enabled ✓

#### ✅ PASS: No Full-Screen Image Hijack
- **Line 192-196:** Images use `object-contain max-h-64`
- Images are constrained, not full-screen
- **Status:** No hijack ✓

#### ✅ PASS: Results Visible Without Extra Taps
- **Line 301-307:** Results render immediately when available
- No collapsible wrapper hiding results
- **Status:** Visible immediately ✓

### Summary
- **PASS:** 5/6 core requirements
- **ISSUES:** 1 (remove image button too small)
- **RECOMMENDATION:** Increase remove button size to ≥ 44px

---

## AUDIT H — ERROR HANDLING
**Status:** ⚠️ **PARTIAL PASS** (Issues Found)

### Files Checked
- ✅ `app/garden/scanner/page.tsx` (Lines 115-131)
- ✅ `lib/scanner/runMultiScan.ts` (Lines 1427-1437)
- ✅ All async call wrappers

### Findings

#### ✅ PASS: All Async Calls Wrapped
- **Line 115-131:** `try/catch` wraps `scanImages()` call
- **Line 1427-1437:** `try/catch` in `scanImages()` function
- **Line 143-156:** Name-first pipeline wrapped
- **Status:** Async calls wrapped ✓

#### ✅ PASS: Errors Surfaced to Console
- **Line 126:** `console.error("ERROR:", error);`
- **Line 1435:** `console.error("scanImages: pipeline error", error);`
- **Status:** Errors logged ✓

#### ✅ PASS: UI Shows Fallback Message
- **Line 127:** `alert("Analysis failed. Please try again with different images.");`
- **Status:** User notified ✓

#### ⚠️ ISSUE: Silent Failure Paths
- **Line 153-155:** Name-first pipeline error caught but `nameFirstPipelineResult = null` - continues silently
- **Line 874-877:** V80 engine error caught but continues with original result
- **Status:** Some failures are silent ⚠️

#### ⚠️ ISSUE: Try/Catch Swallows Errors
- **Line 143-156:** Error caught, logged, but execution continues
- **Line 838-841:** V55 error caught, continues
- **Line 843-872:** V57 error caught, continues
- These are intentional fallbacks, but should log warnings
- **Status:** Errors handled but could be more visible ⚠️

### Summary
- **PASS:** 3/5 core requirements
- **ISSUES:** 2 (silent failures, error visibility)
- **RECOMMENDATION:** 
  - Add `console.warn()` for fallback paths
  - Consider user-visible warnings for degraded mode

---

## OVERALL SUMMARY

### Section Results
- **AUDIT A (Ingest & Input):** ✅ PASS (7/7)
- **AUDIT B (runScan Pipeline):** ⚠️ PARTIAL PASS (4/6)
- **AUDIT C (Consensus Engine):** ✅ PASS (6/6)
- **AUDIT D (Strain Database):** ❌ FAIL (4/7) - **CRITICAL**
- **AUDIT E (View Model Lock):** ✅ PASS (8/8)
- **AUDIT F (UI Rendering):** ✅ PASS (5/5)
- **AUDIT G (Mobile):** ⚠️ PARTIAL PASS (5/6)
- **AUDIT H (Error Handling):** ⚠️ PARTIAL PASS (3/5)

### Critical Issues
1. **CRITICAL:** Database claims 35,000 strains but only contains ~12-15 entries
2. Missing required logs in pipeline (per-image candidates, indica/sativa scores)
3. Potential undefined array joins (need null checks)
4. Remove image button too small for mobile (< 44px)
5. Silent failure paths in error handling

### Priority Fixes Required
1. **P0:** Fix database size mismatch or load actual 35K database
2. **P1:** Add missing required logs
3. **P1:** Add null checks before `.join()` calls
4. **P2:** Increase remove image button size
5. **P2:** Add warning logs for fallback paths

### Files Requiring Changes
- `lib/scanner/cultivarLibrary.ts` - Database size issue
- `lib/scanner/runMultiScan.ts` - Missing logs, undefined joins
- `app/garden/scanner/page.tsx` - Remove button size
- `lib/scanner/consensusEngine.ts` - Add candidate logging

---

**END OF AUDIT REPORT**
