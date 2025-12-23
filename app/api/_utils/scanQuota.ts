/**
 * Scan Quota Backend (Foundation)
 * Authoritative server-side quota checking and enforcement
 */

import { supabaseAdmin } from './supabaseAdmin';

export type ScanType = 'id' | 'doctor';
export type MembershipTier = 'free' | 'pro' | 'elite' | 'garden' | 'standard'; // 'garden' and 'standard' are legacy, map to 'pro'

export interface QuotaCheckResult {
  allowed: boolean;
  reason: 'elite_tier' | 'quota_available' | 'quota_exceeded' | 'user_not_found' | 'invalid_scan_type' | 'unlimited' | 'not_allowed' | 'topup_available';
  reset_at: string | null;
  remaining: number | null; // null = unlimited (includes both monthly quota and top-ups)
  id_scans_used: number;
  doctor_scans_used: number;
  id_scans_limit: number | null;
  doctor_scans_limit: number | null;
  id_scan_topups_remaining?: number;
  doctor_scan_topups_remaining?: number;
}

export interface LimitReachedResponse {
  status: 'limit_reached';
  type: 'id_scan' | 'doctor_scan';
  used: number;
  limit: number | null; // null = unlimited
  reset_date: string | null;
}

export interface QuotaIncrementResult {
  success: boolean;
  id_scans_used: number;
  doctor_scans_used: number;
  reason: string;
}

/**
 * Normalize tier name (map legacy tiers to new system)
 */
function normalizeTier(tier: MembershipTier): 'free' | 'pro' | 'elite' {
  // Map legacy 'garden' and 'standard' to 'pro'
  if (tier === 'garden' || tier === 'standard') {
    return 'pro';
  }
  if (tier === 'elite') {
    return 'elite';
  }
  if (tier === 'pro') {
    return 'pro';
  }
  return 'free';
}

/**
 * Get quota limits for a tier (locked values)
 * Free: Limited (configurable, default 5)
 * Pro: 250 id scans/month, 40 doctor scans/month
 * Elite: Unlimited
 */
export function getQuotaLimits(tier: MembershipTier): { id_scans: number | null; doctor_scans: number | null } {
  const normalized = normalizeTier(tier);
  
  switch (normalized) {
    case 'free':
      // Configurable limit (default 5, can be adjusted via env or config)
      const freeLimit = parseInt(process.env.FREE_TIER_ID_SCAN_LIMIT || '5', 10);
      return { id_scans: freeLimit, doctor_scans: 0 }; // Doctor scans not allowed for free
    case 'pro':
      return { id_scans: 250, doctor_scans: 40 };
    case 'elite':
      return { id_scans: null, doctor_scans: null }; // null = unlimited
    default:
      return { id_scans: 5, doctor_scans: 0 };
  }
}

/**
 * Check if user can perform a scan (server-side, authoritative)
 * This is the ONLY source of truth for quota checks
 */
export async function checkScanQuota(
  userId: string,
  scanType: ScanType
): Promise<QuotaCheckResult> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }

  // Use database function for atomic check
  // Handle both user_id and id columns in profiles
  const { data, error } = await supabaseAdmin.rpc('can_perform_scan', {
    p_user_id: userId,
    p_scan_type: scanType,
  });

  if (error) {
    console.error('Error checking scan quota:', error);
    throw new Error('Failed to check scan quota');
  }

  if (!data || data.length === 0) {
    return {
      allowed: false,
      reason: 'user_not_found',
      reset_at: null,
      remaining: 0,
      id_scans_used: 0,
      doctor_scans_used: 0,
      id_scans_limit: null,
      doctor_scans_limit: null,
    };
  }

  const result = data[0];

  // Get full profile to return usage and limits (including top-ups)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('membership, id_scans_used, doctor_scans_used, id_scan_topups_remaining, doctor_scan_topups_remaining')
    .or(`user_id.eq.${userId},id.eq.${userId}`)
    .single();

  const limits = profile ? getQuotaLimits(profile.membership as MembershipTier) : { id_scans: null, doctor_scans: null };

  // Normalize tier for reason checking
  const normalizedTier = profile ? normalizeTier(profile.membership as MembershipTier) : 'free';
  
  // Determine reason based on tier and quota
  let reason: QuotaCheckResult['reason'] = result.reason as QuotaCheckResult['reason'];
  
  if (normalizedTier === 'elite') {
    reason = 'elite_tier'; // Elite bypasses all limits
  } else if (!result.allowed) {
    if (scanType === 'doctor' && limits.doctor_scans === 0) {
      reason = 'not_allowed'; // Doctor scans not allowed for free tier
    } else {
      reason = 'quota_exceeded';
    }
  } else {
    reason = 'quota_available';
  }

  return {
    allowed: result.allowed || normalizedTier === 'elite', // Elite always allowed
    reason,
    reset_at: result.reset_at,
    remaining: result.remaining, // Includes both monthly quota and top-ups
    id_scans_used: profile?.id_scans_used || 0,
    doctor_scans_used: profile?.doctor_scans_used || 0,
    id_scans_limit: limits.id_scans,
    doctor_scans_limit: limits.doctor_scans,
    id_scan_topups_remaining: profile?.id_scan_topups_remaining || 0,
    doctor_scan_topups_remaining: profile?.doctor_scan_topups_remaining || 0,
  };
}

/**
 * Format quota check result as structured limit_reached response
 */
export function formatLimitReachedResponse(
  quotaCheck: QuotaCheckResult,
  scanType: ScanType
): LimitReachedResponse {
  return {
    status: 'limit_reached',
    type: scanType === 'doctor' ? 'doctor_scan' : 'id_scan',
    used: scanType === 'doctor' ? quotaCheck.doctor_scans_used : quotaCheck.id_scans_used,
    limit: scanType === 'doctor' ? quotaCheck.doctor_scans_limit : quotaCheck.id_scans_limit,
    reset_date: quotaCheck.reset_at,
  };
}

/**
 * Atomically increment scan usage (only if quota allows)
 * This is the ONLY way to increment usage - prevents race conditions
 */
export async function incrementScanUsage(
  userId: string,
  scanType: ScanType
): Promise<QuotaIncrementResult> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }

  // Use database function for atomic increment
  const { data, error } = await supabaseAdmin.rpc('increment_scan_usage', {
    p_user_id: userId,
    p_scan_type: scanType,
  });

  if (error) {
    console.error('Error incrementing scan usage:', error);
    throw new Error('Failed to increment scan usage');
  }

  if (!data || data.length === 0) {
    return {
      success: false,
      id_scans_used: 0,
      doctor_scans_used: 0,
      reason: 'unknown_error',
    };
  }

  const result = data[0];

  return {
    success: result.success,
    id_scans_used: result.id_scans_used || 0,
    doctor_scans_used: result.doctor_scans_used || 0,
    reason: result.reason || 'unknown',
  };
}

/**
 * Get user's current quota status (including top-ups)
 */
export async function getQuotaStatus(userId: string): Promise<{
  tier: MembershipTier;
  id_scans_used: number;
  doctor_scans_used: number;
  id_scans_limit: number | null;
  doctor_scans_limit: number | null;
  quota_reset_at: string;
  id_scan_topups_remaining: number;
  doctor_scan_topups_remaining: number;
}> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('membership, id_scans_used, doctor_scans_used, quota_reset_at, last_reset, id_scan_topups_remaining, doctor_scan_topups_remaining')
    .or(`user_id.eq.${userId},id.eq.${userId}`)
    .single();

  if (error || !profile) {
    throw new Error('Profile not found');
  }

  const limits = getQuotaLimits(profile.membership as MembershipTier);
  
  // Use quota_reset_at if available, fallback to last_reset
  const resetDate = profile.quota_reset_at || profile.last_reset;

  return {
    tier: profile.membership as MembershipTier,
    id_scans_used: profile.id_scans_used || 0,
    doctor_scans_used: profile.doctor_scans_used || 0,
    id_scans_limit: limits.id_scans,
    doctor_scans_limit: limits.doctor_scans,
    quota_reset_at: resetDate,
    id_scan_topups_remaining: profile.id_scan_topups_remaining || 0,
    doctor_scan_topups_remaining: profile.doctor_scan_topups_remaining || 0,
  };
}
