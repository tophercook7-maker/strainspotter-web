/**
 * Private Strain Training - Pro Feature
 * Allows commercial growers to train custom strains
 */

import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TrainStrainClient from './TrainStrainClient';

export default async function TrainStrainPage() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  // Check for pro membership
  // This is a server component - use server-side client
  const { createSupabaseServer } = await import('@/lib/supabase/server');
  const supabase = await createSupabaseServer();
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: profile } = await supabase
    .from('profiles')
    .select('membership')
    .eq('id', user.id)
    .single();

  if (profile?.membership !== 'pro' && profile?.membership !== 'ultimate') {
    redirect('/garden');
  }

  return <TrainStrainClient user={user} />;
}
