// lib/chat/server.ts — shared server helpers for community group chat.
//
// Same enforcement model as B2B: service-role client + explicit checks in
// code. "Can moderate" = participant with role='moderator' in THAT thread,
// or the app owner (profiles.is_owner) everywhere.

import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface GroupParticipant {
  role: "member" | "moderator" | "system";
  muted_until: string | null;
}

export async function getParticipant(
  threadId: string,
  userId: string
): Promise<GroupParticipant | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("chat_participants")
    .select("role, muted_until")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`chat_participants read failed: ${error.message}`);
  return (data as GroupParticipant) ?? null;
}

export async function isOwnerUser(userId: string): Promise<boolean> {
  const { data } = await getSupabaseAdmin()
    .from("profiles")
    .select("is_owner")
    .eq("id", userId)
    .maybeSingle();
  return data?.is_owner === true;
}

export async function canModerate(threadId: string, userId: string): Promise<boolean> {
  const p = await getParticipant(threadId, userId);
  if (p?.role === "moderator") return true;
  return isOwnerUser(userId);
}

export function isMuted(p: GroupParticipant | null): boolean {
  if (!p?.muted_until) return false;
  return new Date(p.muted_until).getTime() > Date.now();
}

/** The 5 seeded community groups are system_group=true 'group' threads. */
export async function isSystemGroup(threadId: string): Promise<boolean> {
  const { data } = await getSupabaseAdmin()
    .from("chat_threads")
    .select("id")
    .eq("id", threadId)
    .eq("type", "group")
    .eq("system_group", true)
    .maybeSingle();
  return Boolean(data);
}
