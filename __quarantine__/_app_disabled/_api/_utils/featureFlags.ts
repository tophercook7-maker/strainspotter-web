/**
 * Server-side Feature Flags Utility
 * Safe, server-side feature flag checking
 * All flags default to false and fail safely
 */

import { supabaseAdmin } from './supabaseAdmin';

export type FeatureFlagKey =
  | 'enable_grow_notes'
  | 'enable_news_sources_v2'
  | 'enable_enriched_scans'
  | 'enable_scan_topups'
  | 'enable_community_intelligence'
  | 'enable_visual_matching'
  | 'phenotype_similarity_v2';

/**
 * Hash a string to a number (deterministic)
 * Used for consistent canary rollout assignment
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Check if user is admin (server-side)
 */
async function isUserAdmin(userId: string | null | undefined): Promise<boolean> {
  if (!userId || !supabaseAdmin) {
    return false;
  }

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .or(`user_id.eq.${userId},id.eq.${userId}`)
      .maybeSingle();

    return profile?.role === 'admin';
  } catch (error) {
    console.warn('[featureFlags] Error checking admin status:', error);
    return false;
  }
}

/**
 * Check if a feature flag is enabled for a user (server-side)
 * Supports canary rollouts for specific flags
 * @param flag - Feature flag key
 * @param userId - User ID (optional)
 * @param userCohort - User cohort (optional, e.g., 'elite', 'pro')
 * @param defaultValue - Default value if flag not found (defaults to false)
 * @returns Promise<boolean>
 */
export async function isFeatureEnabled(
  flag: FeatureFlagKey,
  userId?: string | null,
  userCohort?: string | null,
  defaultValue: boolean = false
): Promise<boolean> {
  if (!supabaseAdmin) {
    // Fail safely - return default
    return defaultValue;
  }

  try {
    // PHASE 1: Check explicit flag override in profiles.feature_flags
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('feature_flags')
        .or(`user_id.eq.${userId},id.eq.${userId}`)
        .maybeSingle();

      if (profile?.feature_flags && typeof profile.feature_flags === 'object') {
        const flags = profile.feature_flags as Record<string, boolean>;
        if (flags[flag] !== undefined) {
          return flags[flag] === true;
        }
      }
    }

    // PHASE 2: Check database feature_flags table
    const { data: dbFlag, error: dbError } = await supabaseAdmin.rpc('get_feature_flag', {
      p_flag_key: flag,
      p_user_id: userId || null,
      p_user_cohort: userCohort || null,
    });

    if (dbError) {
      console.warn(`Error checking feature flag ${flag}:`, dbError);
    }

    // If flag is explicitly disabled in database, return false
    if (dbFlag === false) {
      return false;
    }

    // PHASE 3: Canary rollout logic for phenotype_similarity_v2
    if (flag === 'phenotype_similarity_v2' && userId) {
      // Check if user is admin (always enabled for admins)
      const isAdmin = await isUserAdmin(userId);
      if (isAdmin) {
        return true;
      }

      // Check canary rollout: hash(user_id) % 100 < 10 (~10% exposure)
      const userHash = hashString(userId);
      const rolloutBucket = userHash % 100;
      const inCanary = rolloutBucket < 10;

      // If database flag is explicitly enabled, use that
      // Otherwise, use canary rollout
      if (dbFlag === true) {
        return true;
      }

      return inCanary;
    }

    // PHASE 4: Default behavior for other flags
    if (dbFlag === true) {
      return true;
    }

    return defaultValue;
  } catch (error) {
    console.warn(`Error in feature flag check for ${flag}:`, error);
    // Fail safely - return default
    return defaultValue;
  }
}

/**
 * Get user cohort from profile (helper function)
 */
export async function getUserCohort(userId: string): Promise<string | null> {
  if (!supabaseAdmin) {
    return null;
  }

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('membership')
      .or(`user_id.eq.${userId},id.eq.${userId}`)
      .single();

    if (profile?.membership === 'elite') {
      return 'elite';
    } else if (profile?.membership === 'pro') {
      return 'pro';
    }
    return null;
  } catch (error) {
    console.warn('Error getting user cohort:', error);
    return null;
  }
}
