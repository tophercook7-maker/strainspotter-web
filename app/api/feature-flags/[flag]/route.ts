import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';

/**
 * GET /api/feature-flags/[flag]
 * Check if a specific feature flag is enabled for the current user
 * Returns { enabled: boolean }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ flag: string }> }
) {
  try {
    const { flag } = await params;
    const user = await getUser();
    
    if (!supabaseAdmin) {
      // Fail safely - default to false
      return NextResponse.json({ enabled: false });
    }

    // Get user cohort (if any)
    let userCohort: string | null = null;
    if (user) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('membership')
        .or(`user_id.eq.${user.id},id.eq.${user.id}`)
        .single();
      
      if (profile?.membership === 'elite') {
        userCohort = 'elite';
      } else if (profile?.membership === 'pro') {
        userCohort = 'pro';
      }
    }

    // Check flag using database function
    const { data, error } = await supabaseAdmin.rpc('get_feature_flag', {
      p_flag_key: flag,
      p_user_id: user?.id || null,
      p_user_cohort: userCohort,
    });

    if (error) {
      console.error(`Error checking feature flag ${flag}:`, error);
      // Fail safely - default to false
      return NextResponse.json({ enabled: false });
    }

    return NextResponse.json({ enabled: data === true });
  } catch (error) {
    console.error(`Error in feature flag check for ${params}:`, error);
    // Fail safely - default to false
    return NextResponse.json({ enabled: false });
  }
}
