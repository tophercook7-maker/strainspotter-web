/**
 * Scan Quota Backend (Foundation)
 * Authoritative server-side quota checking and enforcement
 */

import { supabaseAdmin } from './supabaseAdmin';

export type ScanType = 'id' | 'doctor';
export type MembershipTier = 'free' | 'standard' | 'pro';

export interface QuotaCheckResult {
  allowed: boolean;
  reason: 'pro_tier' | 'quota_available' | 'quota_exceeded' | 'user_not_found' | 'invalid_scan_type' | 'unlimited';
  reset_at: string | null;
  remaining: number | null; // null = unlimited
  id_scans_used: number;
  doctor_scans_used: number;
  id_scans_limit: number | null;
  doctor_scans_limit: number | null;
}

export interface QuotaIncrementResult {
  success: boolean;
  id_scans_used: number;
  doctor_scans_used: number;
  reason: string;
}

/**
 * Get quota limits for a tier (locked values)
 */
export function getQuotaLimits(tier: MembershipTier): { id_scans: number | null; doctor_scans: number | null } {
  switch (tier) {
    case 'free':
      return { id_scans: 5, doctor_scans: 0 }; // Very limited
    case 'standard':
      return { id_scans: 250, doctor_scans: 40 };
    case 'pro':
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

  // Get full profile to return usage and limits
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('membership, id_scans_used, doctor_scans_used')
    .or(`user_id.eq.${userId},id.eq.${userId}`)
    .single();

  const limits = profile ? getQuotaLimits(profile.membership as MembershipTier) : { id_scans: null, doctor_scans: null };

  return {
    allowed: result.allowed,
    reason: result.reason as QuotaCheckResult['reason'],
    reset_at: result.reset_at,
    remaining: result.remaining,
    id_scans_used: profile?.id_scans_used || 0,
    doctor_scans_used: profile?.doctor_scans_used || 0,
    id_scans_limit: limits.id_scans,
    doctor_scans_limit: limits.doctor_scans,
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
 * Get user's current quota status
 */
export async function getQuotaStatus(userId: string): Promise<{
  tier: MembershipTier;
  id_scans_used: number;
  doctor_scans_used: number;
  id_scans_limit: number | null;
  doctor_scans_limit: number | null;
  quota_reset_at: string;
}> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('membership, id_scans_used, doctor_scans_used, quota_reset_at')
    .or(`user_id.eq.${userId},id.eq.${userId}`)
    .single();

  if (error || !profile) {
    throw new Error('Profile not found');
  }

  const limits = getQuotaLimits(profile.membership as MembershipTier);

  return {
    tier: profile.membership as MembershipTier,
    id_scans_used: profile.id_scans_used || 0,
    doctor_scans_used: profile.doctor_scans_used || 0,
    id_scans_limit: limits.id_scans,
    doctor_scans_limit: limits.doctor_scans,
    quota_reset_at: profile.quota_reset_at,
  };
}
