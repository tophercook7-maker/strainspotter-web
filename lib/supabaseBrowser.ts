// Re-export getSupabaseClient as getSupabaseBrowserClient for backward compatibility
// This ensures only ONE client instance exists
export { getSupabaseClient as getSupabaseBrowserClient } from './supabaseClient';

// Mock user for protected pages (temporary)
export const MOCK_USER = {
  id: 'mock-user-id-temp',
  email: 'mock@strainspotter.app',
  user_metadata: {},
  app_metadata: {},
};
