import { notFound } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';
import OwnerDashboard from '@/components/owner/OwnerDashboard';

/**
 * Owner Dashboard Page
 * Strictly gated - only owners can access
 * Returns 404 if not owner (no redirects, no error messages)
 */
export default async function OwnerPage() {
  const user = await getUser();
  
  if (!user) {
    // Not authenticated - return 404
    notFound();
  }

  // Check if user is owner
  if (!supabaseAdmin) {
    notFound();
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_owner')
    .or(`user_id.eq.${user.id},id.eq.${user.id}`)
    .single();

  if (!profile || !profile.is_owner) {
    // Not owner - return 404
    notFound();
  }

  // Owner confirmed - show dashboard
  return <OwnerDashboard />;
}
