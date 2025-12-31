// Re-export the singleton client for backward compatibility
import { supabase } from "./supabaseClient";

export const supabaseLoginClient = supabase;
