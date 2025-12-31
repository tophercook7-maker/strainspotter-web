// Re-export supabase client for backward compatibility
export { supabase as getSupabaseBrowserClient } from './supabaseClient';

// Mock user for protected pages (temporary)
export const MOCK_USER = {
  id: 'mock-user-id-temp',
  email: 'mock@strainspotter.app',
  user_metadata: {},
  app_metadata: {},
};
