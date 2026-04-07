import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

type ThreadIdentity = { userId: string | null; threadIdFromCookie: string | null };

export async function getFeedbackIdentity(): Promise<ThreadIdentity> {
  const jar = await cookies();
  const tid = jar.get("ss_feedback_tid")?.value ?? null;
  // If you have auth wired, we can upgrade this to use supabase auth session user_id.
  // For now: userId is null unless you later wire server-auth.
  return { userId: null, threadIdFromCookie: tid };
}

export async function setFeedbackThreadCookie(threadId: string): Promise<void> {
  const jar = await cookies();
  jar.set("ss_feedback_tid", threadId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_service_role_env");
  return createClient(url, key, { auth: { persistSession: false } });
}
