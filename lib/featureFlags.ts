/**
 * Feature Flags Utility
 * Safe, client-side feature flag checking
 * All flags default to false and fail safely
 */

export type FeatureFlagKey =
  | 'enable_grow_notes'
  | 'enable_news_sources_v2'
  | 'enable_enriched_scans'
  | 'enable_scan_topups'
  | 'enable_community_intelligence'
  | 'enable_visual_matching';

let flagsCache: Record<string, boolean> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch feature flags from API
 * Caches results for 5 minutes
 */
async function fetchFlags(): Promise<Record<string, boolean>> {
  const now = Date.now();
  
  // Return cached flags if still valid
  if (flagsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return flagsCache;
  }

  try {
    const response = await fetch('/api/feature-flags', {
      cache: 'no-store', // Always fetch fresh from server
    });

    if (!response.ok) {
      console.warn('Failed to fetch feature flags, defaulting to disabled');
      return {};
    }

    const data = await response.json();
    flagsCache = data.flags || {};
    cacheTimestamp = now;
    return flagsCache;
  } catch (error) {
    console.warn('Error fetching feature flags:', error);
    // Fail safely - return empty object (all flags disabled)
    return {};
  }
}

/**
 * Check if a feature flag is enabled
 * @param flag - Feature flag key
 * @param defaultValue - Default value if flag not found (defaults to false)
 * @returns Promise<boolean>
 */
export async function isFeatureEnabled(
  flag: FeatureFlagKey,
  defaultValue: boolean = false
): Promise<boolean> {
  try {
    const flags = await fetchFlags();
    return flags[flag] ?? defaultValue;
  } catch (error) {
    console.warn(`Error checking feature flag ${flag}:`, error);
    // Fail safely - return default (false)
    return defaultValue;
  }
}

/**
 * Check if a feature flag is enabled (synchronous, uses cache)
 * Use this in components that need immediate flag value
 * @param flag - Feature flag key
 * @param defaultValue - Default value if flag not found (defaults to false)
 * @returns boolean
 */
export function isFeatureEnabledSync(
  flag: FeatureFlagKey,
  defaultValue: boolean = false
): boolean {
  if (!flagsCache) {
    // Cache not loaded yet, return default
    return defaultValue;
  }
  return flagsCache[flag] ?? defaultValue;
}

/**
 * Clear feature flags cache (force refresh on next check)
 */
export function clearFlagsCache(): void {
  flagsCache = null;
  cacheTimestamp = 0;
}

/**
 * React hook for feature flags (client-side only)
 * Note: Import React in your component file if using this hook
 */
export function useFeatureFlag(flag: FeatureFlagKey, defaultValue: boolean = false) {
  if (typeof window === 'undefined') {
    // Server-side: always return default
    return defaultValue;
  }

  // This hook requires React to be imported in the component file
  // Example usage:
  // import React, { useState, useEffect } from 'react';
  // import { useFeatureFlag } from '@/lib/featureFlags';
  // const enabled = useFeatureFlag('enable_grow_notes');
  
  throw new Error('useFeatureFlag hook requires React. Use isFeatureEnabled() instead or import React in your component.');
}
