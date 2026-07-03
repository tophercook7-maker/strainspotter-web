// lib/b2b/server.ts
//
// Shared server-side helpers for the B2B Connect API (/api/b2b/*).
//
// Access model: every route requires an active subscription (requireSubscription)
// AND — beyond profile creation — an existing business profile. All DB access
// goes through the service-role client with EXPLICIT ownership checks in code
// (equivalent to the RLS design in 017_b2b_connect.sql; service role bypasses
// RLS so the checks here are the enforcement). Contact fields are only ever
// returned for ACCEPTED connections the caller participates in.

import { getSupabaseAdmin } from "@/lib/supabase/server";

export const B2B_ROLES = ["grower", "lab", "dispensary", "breeder", "processor"] as const;
export type B2BRole = (typeof B2B_ROLES)[number];

export interface BusinessProfile {
  id: string;
  user_id: string;
  role: B2BRole | null;
  business_name: string | null;
  region: string | null;
  bio: string | null;
  license_number: string | null;
  verified: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  directory_opt_in: boolean;
  created_at: string;
}

/** Columns safe to show other businesses (never contact fields). */
export const DIRECTORY_COLUMNS =
  "id, role, business_name, region, bio, verified, created_at";

const PROFILE_COLUMNS =
  "id, user_id, role, business_name, region, bio, license_number, verified, contact_email, contact_phone, directory_opt_in, created_at";

export async function getBusinessProfile(userId: string): Promise<BusinessProfile | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("business_profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`business_profiles read failed: ${error.message}`);
  return (data as unknown as BusinessProfile) ?? null;
}

export function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t.length ? t : null;
}

export function isB2BRole(v: unknown): v is B2BRole {
  return typeof v === "string" && (B2B_ROLES as readonly string[]).includes(v);
}

/** Loose email/phone shape checks — these are self-reported business contacts. */
export function cleanEmail(v: unknown): string | null {
  const t = cleanText(v, 200);
  if (!t) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t) ? t : null;
}
export function cleanPhone(v: unknown): string | null {
  const t = cleanText(v, 40);
  if (!t) return null;
  return /^[+\d][\d\s().-]{6,}$/.test(t) ? t : null;
}

/** Is this user a participant of the chat thread? */
export async function isThreadParticipant(threadId: string, userId: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from("chat_participants")
    .select("id")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`chat_participants read failed: ${error.message}`);
  return Boolean(data);
}

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
