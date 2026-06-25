// lib/billing/founder.ts
//
// Shared Founder-lifetime inventory logic. The marketing promise is
// "first 1,000". The /api/founder/remaining counter is informational (cached);
// the ENFORCEMENT happens at checkout via isFounderSoldOut() (live, uncached)
// so we don't oversell past the cap.

export const FOUNDER_CAP = 1000;

/** Live count of founder purchases (profiles.founder_purchase_at not null). */
export async function countFoundersSold(): Promise<number> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase not configured");

  const res = await fetch(`${supabaseUrl}/rest/v1/profiles?founder_purchase_at=not.is.null&select=id`, {
    method: "HEAD",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
  });
  if (!res.ok && res.status !== 206) throw new Error(`Founder count failed: ${res.status}`);

  // Content-Range: 0-0/<total>
  const total = parseInt((res.headers.get("content-range") || "").split("/")[1] || "0", 10);
  return Number.isFinite(total) ? total : 0;
}

export function founderRemaining(sold: number): number {
  return Math.max(0, FOUNDER_CAP - sold);
}

/**
 * Live sold-out check used to ENFORCE the cap when a founder checkout is
 * created. Bounds the oversell to (at most) the few concurrent buyers at the
 * very last slot, instead of the previous 60s-cached unbounded gap.
 */
export async function isFounderSoldOut(): Promise<boolean> {
  return (await countFoundersSold()) >= FOUNDER_CAP;
}
