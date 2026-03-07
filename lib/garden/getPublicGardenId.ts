import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve Public Garden id for anonymous users.
 * Ensures one row exists with user_id null, returns its id.
 */
export async function getPublicGardenId(
  supabase: SupabaseClient
): Promise<string> {
  const { data: existing } = await supabase
    .from("gardens")
    .select("id")
    .is("user_id", null)
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: inserted, error } = await supabase
    .from("gardens")
    .insert({ user_id: null, name: "Public Garden" })
    .select("id")
    .single();

  if (error || !inserted?.id) {
    throw new Error(
      "Could not ensure Public Garden: " + (error?.message ?? "no id")
    );
  }
  return inserted.id;
}
