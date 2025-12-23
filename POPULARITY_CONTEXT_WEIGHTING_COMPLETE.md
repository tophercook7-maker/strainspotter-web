# Popularity + Context Weighting — COMPLETE

## Overview

Improved perceived scanner accuracy by gently favoring common, likely strains when confidence is ambiguous, without overpowering OCR or visual signals.

## Key Rules ✅

- ✅ **NO new scraping** performed
- ✅ **NO UI changes** for end users
- ✅ **NO breaking changes** to existing scoring
- ✅ **Popularity is a tie-breaker**, NOT a primary signal

## Part 1: Popularity Priors ✅

### Implementation

**File**: `lib/visual/popularity.ts`

**Structure**:
- Static map of popularity scores (0-1)
- Tiered system:
  - **Tier 1** (1.0): Most popular strains (Blue Dream, OG Kush, GSC, etc.)
  - **Tier 2** (0.95): Very popular strains
  - **Tier 3** (0.9): Popular strains
  - **Tier 4** (0.8): Moderately popular strains
  - **Default** (0.5): Unknown strains (neutral)

**Functions**:
- `getPopularityPrior(slug)`: Returns popularity score (defaults to 0.5)
- `isObscureStrain(slug, threshold)`: Checks if strain is obscure (< threshold)

**Features**:
- Normalized to 0-1
- Default to 0.5 if unknown
- Never dominates scoring alone

## Part 2: Context-Aware Dampening ✅

### Implementation

**File**: `app/api/visual-match/route.ts`

**Logic**:
```typescript
IF:
  - OCR confidence < LOW_OCR_THRESHOLD (50)
  - AND visual distance > MID_VISUAL_DISTANCE (8)

THEN:
  - Popular strains: Multiply popularity prior by 1.2
  - Obscure strains (<0.4 popularity): Multiply score by 0.8
```

**Features**:
- Soft bias, not exclusion
- Does NOT remove candidates entirely
- Only applies when signals are genuinely weak
- Prevents obscure strains from ranking high on weak matches

## Part 3: Score Integration ✅

### Implementation

**Formula**:
```typescript
final_score = 
  base_score (OCR + Visual)
  + (POPULARITY_WEIGHT * adjusted_popularity_prior * 100)
```

**Constants** (in `calibration.ts`):
- `POPULARITY_WEIGHT`: 0.1 (10% influence)
- `MAX_POPULARITY_BOOST`: 10 points (cap)
- `POPULARITY_MULTIPLIER`: 1.2 (for weak signals)
- `OBSCURE_PENALTY`: 0.8 (for obscure strains in weak signals)

**Rules**:
- Popularity boost capped at 10 points
- Popularity does NOT override strong OCR or visual matches
- All constants centralized in `calibration.ts`

## Part 4: Internal Reasoning (Dev Only) ✅

### Implementation

**Debug Output**:
```json
{
  "debug": {
    "best_match_reasons": [
      "moderate_ocr_match",
      "weak_visual_match",
      "high_popularity",
      "popularity_boost_applied"
    ]
  }
}
```

**Reasoning Types**:
- `strong_ocr_match` (≥60%)
- `moderate_ocr_match` (≥40%)
- `weak_ocr_match` (>0%)
- `strong_visual_match` (≥70%)
- `moderate_visual_match` (≥50%)
- `weak_visual_match` (>0%)
- `high_popularity` (≥0.9)
- `moderate_popularity` (≥0.7)
- `popularity_boost_applied`
- `obscure_strain_dampened`

**Rules**:
- DEV ONLY (same conditions as other debug data)
- No UI exposure
- Used for tuning + trust validation

## Success Criteria ✅

- ✅ Common strains rank higher when confidence is ambiguous
- ✅ Obscure strains still win when signals are strong
- ✅ No noticeable behavior change on strong OCR matches
- ✅ Debug output explains why a strain ranked higher

## Behavior Examples

### Scenario 1: Strong OCR Match
- OCR: 75%, Visual: 0%
- Popularity: 0.5 (unknown)
- **Result**: Strong OCR wins (popularity adds only +5 points, doesn't change ranking)

### Scenario 2: Weak Signals, Popular Strain
- OCR: 35%, Visual: 0%, Distance: 10
- Popularity: 1.0 (Blue Dream)
- **Result**: Popularity boost applied (+10 points), context dampening favors popular strain

### Scenario 3: Weak Signals, Obscure Strain
- OCR: 35%, Visual: 0%, Distance: 10
- Popularity: 0.3 (obscure)
- **Result**: Score reduced by 20% (OBSCURE_PENALTY), less likely to rank high

### Scenario 4: Strong Visual Match
- OCR: 0%, Visual: 80%
- Popularity: 0.5 (unknown)
- **Result**: Strong visual wins (popularity doesn't override)

## Files Created/Modified

1. **`lib/visual/popularity.ts`**: Popularity priors map and utilities
2. **`lib/visual/calibration.ts`**: Added popularity constants
3. **`app/api/visual-match/route.ts`**: Integrated popularity and context dampening

## Calibration

To adjust popularity influence, edit `lib/visual/calibration.ts`:

```typescript
// Increase popularity influence
export const POPULARITY_WEIGHT = 0.15; // 15% instead of 10%

// Stricter context dampening
export const LOW_OCR_THRESHOLD = 60; // Higher threshold
export const MID_VISUAL_DISTANCE = 6; // Lower distance threshold

// More aggressive obscure penalty
export const OBSCURE_PENALTY = 0.7; // 30% reduction instead of 20%
```

## Notes

- Popularity is a **tie-breaker**, not a primary signal
- Strong OCR or visual matches always win
- Popularity only matters when signals are ambiguous
- Context dampening prevents obscure strains from ranking high on weak matches
- All changes are internal - no user-facing behavior changes
- Debug output helps validate that popularity is working as intended
