/**
 * Auth State Change Handlers
 * Upserts user profile on sign-in
 */

import { supabase } from "@/lib/supabase";

export interface User {
  id: string;
  email?: string;
  [key: string]: any;
}

/**
 * Upsert user profile on login
 * Sets both id and user_id to satisfy:
 * - id: NOT NULL constraint
 * - user_id: PRIMARY KEY constraint
 * - display_name: NOT NULL constraint (fallback from email)
 * Do NOT use onConflict - PostgREST defaults to PRIMARY KEY (user_id)
 */
export async function upsertProfile(user: User | null) {
  if (!user) return;

  const email = user.email ?? "";
  const fallbackName =
    email.includes("@") ? email.split("@")[0] : "Grower";

  const payload = {
    id: user.id,                 // satisfies NOT NULL
    user_id: user.id,            // PRIMARY KEY
    email,
    display_name: fallbackName,  // satisfies NOT NULL
    last_login: new Date().toISOString(),
  };

  const { error } = await supabase.from("profiles").upsert(payload);

  if (error) {
    console.error("[onAuth] Profile upsert failed (non-blocking):", error);
  }
}
