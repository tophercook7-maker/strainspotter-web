/**
 * Strain Popularity Priors
 * 
 * Lightweight popularity scores for common strains.
 * Used as a tie-breaker when confidence is ambiguous.
 * 
 * RULES:
 * - Normalized to 0-1
 * - Default to 0.5 if unknown
 * - Never dominates scoring alone
 */

export const POPULARITY_PRIORS: Record<string, number> = {
  // Tier 1: Most popular (1.0)
  "blue-dream": 1.0,
  "og-kush": 1.0,
  "girl-scout-cookies": 1.0,
  "sour-diesel": 1.0,
  "white-widow": 1.0,
  "granddaddy-purple": 1.0,
  "ak-47": 1.0,
  "northern-lights": 1.0,
  
  // Tier 2: Very popular (0.95)
  "gelato": 0.95,
  "wedding-cake": 0.95,
  "zookies": 0.95,
  "purple-punch": 0.95,
  "green-crack": 0.95,
  "jack-herer": 0.95,
  "durban-poison": 0.95,
  "trainwreck": 0.95,
  "bubble-gum": 0.95,
  "afghan-kush": 0.95,
  
  // Tier 3: Popular (0.9)
  "strawberry-cough": 0.9,
  "blue-cheese": 0.9,
  "cheese": 0.9,
  "amnesia-haze": 0.9,
  "super-lemon-haze": 0.9,
  "pineapple-express": 0.9,
  "cherry-pie": 0.9,
  "do-si-dos": 0.9,
  "gorilla-glue": 0.9,
  "mimosa": 0.9,
  
  // Tier 4: Moderately popular (0.8)
  "tangerine-dream": 0.8,
  "blueberry": 0.8,
  "bubba-kush": 0.8,
  "master-kush": 0.8,
  "hindu-kush": 0.8,
  "skunk": 0.8,
  "white-rhino": 0.8,
  "chocolate-chip": 0.8,
  "lemon-haze": 0.8,
  "purple-haze": 0.8,
};

/**
 * Get popularity prior for a strain
 * Returns 0.5 (neutral) if unknown
 */
export function getPopularityPrior(strainSlug: string): number {
  return POPULARITY_PRIORS[strainSlug] ?? 0.5;
}

/**
 * Check if a strain is considered obscure (low popularity)
 */
export function isObscureStrain(strainSlug: string, threshold: number = 0.4): boolean {
  return getPopularityPrior(strainSlug) < threshold;
}
