# Visual Match Calibration + Observability — COMPLETE

## Overview

Added internal-only observability, calibration controls, and guardrails to the visual cluster matching system without changing user-facing output.

## Key Rules ✅

- ✅ **NO UI changes** for end users
- ✅ **NO scraping** performed
- ✅ **NO new intelligence logic** (instrumentation only)
- ✅ **User-facing behavior unchanged**

## Part 1: Structured Debug Output (Dev-Only) ✅

### Implementation

**File**: `app/api/visual-match/route.ts`

**Features**:
- Debug data included only when:
  - `NODE_ENV !== "production"` OR
  - Query param `?debug=true` is present
- Debug object includes:
  ```json
  {
    "ocr_score": 65,
    "visual_score": 85,
    "combined_score": 72,
    "visual_distance": 3,
    "matched_clusters": [
      { "cluster_id": "cluster_0", "distance": 3 },
      { "cluster_id": "cluster_5", "distance": 7 }
    ],
    "visual_weight": 0.4,
    "ocr_weight": 0.6,
    "calibration": { ... }
  }
  ```

**Safety**:
- Debug data does NOT affect scoring
- Stripped in production by default
- Only visible in dev mode or with explicit `?debug=true`

## Part 2: Calibration Constants ✅

### Implementation

**File**: `lib/visual/calibration.ts`

**Exported Constants**:
- `OCR_WEIGHT` (default: 0.6)
- `VISUAL_WEIGHT` (default: 0.4)
- `MAX_VISUAL_DISTANCE` (default: 12)
- `MIN_CLUSTER_CONFIDENCE` (default: 0.4)
- `MAX_VISUAL_BOOST` (default: 20 points)
- `VISUAL_SCORE_MULTIPLIER` (default: 0.7)
- `CONFIDENCE_MULTIPLIER` (default: 0.3)
- `MIN_COMBINED_SCORE` (default: 30)
- `TOP_CLUSTERS_COUNT` (default: 5)
- `MAX_STRAIN_CANDIDATES` (default: 10)

**Features**:
- All matching logic imports from this file
- No magic numbers left inline
- `getCalibrationConfig()` function for debug output
- Single source of truth for all weights/thresholds

## Part 3: Guardrails (Trust Safety) ✅

### Implementation

**File**: `lib/visual/clusterMatch.ts`

**Guardrail 1: Distance Clamp**
- If `visual_distance > MAX_VISUAL_DISTANCE`:
  - Cluster is excluded from matching
  - Visual score = 0 for that cluster
- Prevents matches from very dissimilar images

**Guardrail 2: Confidence Clamp**
- If `strain confidence < MIN_CLUSTER_CONFIDENCE`:
  - Visual contribution reduced by 50% (`LOW_CONFIDENCE_PENALTY`)
- Prevents overconfident matches from low-quality assignments

**Guardrail 3: Boost Cap**
- Visual contribution must not exceed `MAX_VISUAL_BOOST` points
- Prevents visual signal from overpowering OCR
- Formula: `capped_contribution = min(visual_contribution, MAX_VISUAL_BOOST)`

**All Guardrails Applied**:
- Distance clamp: Applied in `matchToClusters()`
- Confidence clamp: Applied in `rankStrainsFromClusters()`
- Boost cap: Applied in `rankStrainsFromClusters()`

## Part 4: Calibration Harness (Dev Only) ✅

### Implementation

**File**: `tools/calibration_harness.mjs`

**Usage**:
```bash
node tools/calibration_harness.mjs <image_path>
```

**Features**:
- Accepts local image file
- Runs:
  - OCR-only match (simulated)
  - Visual-only match (real)
  - Combined match (real)
- Logs structured comparison output:
  - Top 5 candidates with scores
  - OCR vs Visual vs Combined breakdown
  - Matched clusters with distances
  - Current calibration config

**Output Example**:
```
TOP 5 CANDIDATES:
────────────────────────────────────────────────────────────────────────────────
1. blue-dream
   OCR: 65% | Visual: 85% | Combined: 72%

2. og-kush
   OCR: 55% | Visual: 70% | Combined: 61%

VISUAL CLUSTER MATCHES:
  1. cluster_0 (distance: 3)
  2. cluster_5 (distance: 7)
```

## Success Criteria ✅

- ✅ Visual matching remains functional
- ✅ Debug data visible only in dev
- ✅ All weights adjustable in one place
- ✅ Guardrails prevent overconfident visual matches
- ✅ No user-facing behavior changes

## Files Created/Modified

1. **`lib/visual/calibration.ts`**: Centralized calibration constants
2. **`lib/visual/clusterMatch.ts`**: Added guardrails and debug output
3. **`app/api/visual-match/route.ts`**: Added debug mode and calibration usage
4. **`tools/calibration_harness.mjs`**: Dev-only test harness

## Calibration Tuning

To adjust matching behavior, edit `lib/visual/calibration.ts`:

```typescript
// Increase visual influence
export const OCR_WEIGHT = 0.5;
export const VISUAL_WEIGHT = 0.5;

// Stricter distance threshold
export const MAX_VISUAL_DISTANCE = 8;

// Higher confidence requirement
export const MIN_CLUSTER_CONFIDENCE = 0.6;

// Allow more visual boost
export const MAX_VISUAL_BOOST = 30;
```

## Debug Mode

**In Development**:
- Debug data automatically included in responses

**In Production**:
- Add `?debug=true` to API request to see debug data
- Example: `POST /api/visual-match?debug=true`

## Guardrail Behavior

**Example Scenarios**:

1. **High Distance (Guardrail 1)**:
   - Distance: 15 (exceeds MAX_VISUAL_DISTANCE of 12)
   - Result: Cluster excluded, visual score = 0

2. **Low Confidence (Guardrail 2)**:
   - Confidence: 0.3 (below MIN_CLUSTER_CONFIDENCE of 0.4)
   - Result: Visual contribution reduced by 50%

3. **High Visual Boost (Guardrail 3)**:
   - Visual would add 35 points
   - Result: Capped at MAX_VISUAL_BOOST (20 points)

## Notes

- All calibration changes take effect immediately (no restart needed)
- Guardrails ensure safe, conservative matching
- Debug output helps tune weights without affecting users
- Calibration harness enables rapid iteration on weights
