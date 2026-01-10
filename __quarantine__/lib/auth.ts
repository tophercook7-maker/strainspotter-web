// lib/auth.ts

import { createSupabaseServer } from '@/lib/supabase/server';

export interface User {
  id: string;
  email?: string;
  username?: string;
  avatar_url?: string;
  role?: string;
}

export async function getUser(): Promise<User | null> {
  try {
    // Check if Supabase env vars are configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return null;
    }

    const supabase = await createSupabaseServer();
    
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return null;
    }

    // Fetch profile data including role
    // Note: Using user_id as primary key (matches DB schema)
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url, role')
      .eq('user_id', session.user.id)
      .single();

    return {
      id: session.user.id,
      email: session.user.email,
      username: profile?.username,
      avatar_url: profile?.avatar_url,
      role: profile?.role || 'member', // Default to 'member' if no role set
    };
  } catch (error) {
    // Silently return null if Supabase is not configured or other errors occur
    return null;
  }
}
