import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAuthEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return { supabaseUrl, supabaseAnonKey };
}

/** Resolve scanner-feedback identity: logged-in user > stable device id > "anonymous". No secrets exposed. */
export async function resolveFeedbackUserId(
  req: NextRequest,
  bodyDeviceId?: string | null
): Promise<string> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const env = getSupabaseAuthEnv();
    if (env) {
      const token = authHeader.slice(7);
      const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) return user.id;
    }
  }

  const headerDevice =
    req.headers.get("x-ss-feedback-device")?.trim() ||
    req.headers.get("x-ss-feedback-device-id")?.trim() ||
    "";
  const raw = headerDevice || bodyDeviceId?.trim() || "";
  const sanitized = raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  if (sanitized.length >= 8) return `device:${sanitized}`;

  return "anonymous";
}
