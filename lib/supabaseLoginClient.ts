// Re-export the singleton client for backward compatibility
// All code should use getSupabaseBrowserClient() directly
import { getSupabaseBrowserClient } from "./supabaseBrowser";

export const supabaseLoginClient = getSupabaseBrowserClient();
