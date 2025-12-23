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
  | 'enable_visual_matching';

/**
 * Check if a feature flag is enabled for a user (server-side)
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
    const { data, error } = await supabaseAdmin.rpc('get_feature_flag', {
      p_flag_key: flag,
      p_user_id: userId || null,
      p_user_cohort: userCohort || null,
    });

    if (error) {
      console.warn(`Error checking feature flag ${flag}:`, error);
      // Fail safely - return default
      return defaultValue;
    }

    return data === true;
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
