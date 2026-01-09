import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';

/**
 * GET /api/feature-flags
 * Get all feature flags for the current user
 * Returns flags that are enabled globally or for the user/cohort
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    
    // Get user cohort (if any) - could be from profile or membership tier
    let userCohort: string | null = null;
    if (user && supabaseAdmin) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('membership')
        .or(`user_id.eq.${user.id},id.eq.${user.id}`)
        .single();
      
      // Map membership tier to cohort (optional)
      if (profile?.membership === 'elite') {
        userCohort = 'elite';
      } else if (profile?.membership === 'pro') {
        userCohort = 'pro';
      }
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get all feature flags for this user
    const { data: flags, error } = await supabaseAdmin.rpc('get_user_feature_flags', {
      p_user_id: user?.id || null,
      p_user_cohort: userCohort,
    });

    if (error) {
      console.error('Error fetching feature flags:', error);
      // Fail safely - return empty flags object
      return NextResponse.json({ flags: {} });
    }

    // Convert array to object for easier client-side access
    const flagsObject: Record<string, boolean> = {};
    if (flags && Array.isArray(flags)) {
      flags.forEach((flag: { flag_key: string; enabled: boolean }) => {
        flagsObject[flag.flag_key] = flag.enabled;
      });
    }

    return NextResponse.json({ flags: flagsObject });
  } catch (error) {
    console.error('Error in feature flags API:', error);
    // Fail safely - return empty flags object
    return NextResponse.json({ flags: {} });
  }
}
