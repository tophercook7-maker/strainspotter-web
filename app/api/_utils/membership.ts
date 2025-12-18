import { supabaseAdmin } from './supabaseAdmin';

export type MembershipTier = 'free' | 'garden' | 'standard' | 'pro';

export interface MembershipDefaults {
  scans: number;
  doctor: number;
}

export interface Profile {
  id: string;
  membership: MembershipTier;
  scans_remaining: number;
  doctor_scans_remaining: number;
  last_reset: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get default scan allocations for each membership tier
 */
export function getDefaultsForMembership(membership: MembershipTier): MembershipDefaults {
  switch (membership) {
    case 'free':
      return { scans: 5, doctor: 0 }; // Very limited
    case 'garden':
    case 'standard': // 'garden' is legacy, map to 'standard'
      return { scans: 250, doctor: 40 };
    case 'pro':
      return { scans: null as any, doctor: null as any }; // Unlimited (represented as null)
    default:
      return { scans: 5, doctor: 0 };
  }
}

/**
 * Check if scans should be reset (30 days since last reset)
 */
export function shouldResetScans(lastReset: string): boolean {
  const lastResetDate = new Date(lastReset);
  const now = new Date();
  const daysSinceReset = (now.getTime() - lastResetDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceReset >= 30;
}

/**
 * Get or create user profile
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  if (!supabaseAdmin) {
    return null;
  }
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Profile doesn't exist, create it
      if (!supabaseAdmin) {
        return null;
      }
      const defaults = getDefaultsForMembership('free');
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,        // satisfies NOT NULL constraint
          user_id: userId,  // satisfies PRIMARY KEY
          membership: 'free',
          scans_remaining: defaults.scans,
          doctor_scans_remaining: defaults.doctor,
          last_reset: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return null;
      }
      return newProfile as Profile;
    }
    console.error('Error fetching profile:', error);
    return null;
  }

  return data as Profile;
}

/**
 * Reset scans to default values for membership tier
 */
export async function resetScansToDefaults(userId: string, membership: MembershipTier): Promise<Profile | null> {
  if (!supabaseAdmin) {
    return null;
  }
  const defaults = getDefaultsForMembership(membership);
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({
      scans_remaining: defaults.scans,
      doctor_scans_remaining: defaults.doctor,
      last_reset: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error resetting scans:', error);
    return null;
  }

  return data as Profile;
}

/**
 * Update profile
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<Profile | null> {
  if (!supabaseAdmin) {
    return null;
  }
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return null;
  }

  return data as Profile;
}

