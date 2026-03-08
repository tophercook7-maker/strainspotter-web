import TopNav from "../_components/TopNav";
import { createServerClient } from "../../_server/supabase/server";
import Link from "next/link";
import { getScanPrimaryLabel } from "@/lib/scanPrimary";
import { getPublicGardenId } from "@/lib/garden/getPublicGardenId";

function isActivityPing(scan: { result_payload?: unknown }): boolean {
  const r = scan?.result_payload;
  return !!r && typeof r === "object" && (r as { kind?: string }).kind === "activity_ping";
}

function isGrowCoachPlan(scan: { result_payload?: unknown; result?: unknown }) {
  const r = scan?.result_payload ?? scan?.result;
  return r && typeof r === "object" && (r as { kind?: string }).kind === "grow_coach_plan";
}

function isCoachEntry(scan: { image_url?: string | null; result_payload?: unknown; result?: unknown }): boolean {
  const img = scan?.image_url;
  const r = scan?.result_payload ?? scan?.result;
  if (r && typeof r === "object" && (r as { kind?: string }).kind === "grow_coach_plan") return true;
  if (typeof img === "string" && img.startsWith("data:application/json")) return true;
  return false;
}

/**
 * Priority: 1) image_url 2) result_payload.image_url 3) resultPayload.image_url
 * 4) result_payload.coverImage 5) resultPayload.coverImage
 */
function getHistoryImageUrl(scan: {
  image_url?: string | null;
  result_payload?: unknown;
  resultPayload?: unknown;
}): string | null {
  const img = scan?.image_url;
  if (img && typeof img === "string" && !img.startsWith("data:application/json")) return img;
  const rp = scan?.result_payload as { image_url?: string; coverImage?: string } | undefined;
  if (rp && typeof rp === "object") {
    const u = rp.image_url ?? rp.coverImage;
    if (u && typeof u === "string") return u;
  }
  const rpAlt = scan?.resultPayload as { image_url?: string; coverImage?: string } | undefined;
  if (rpAlt && typeof rpAlt === "object") {
    const u = rpAlt.image_url ?? rpAlt.coverImage;
    if (u && typeof u === "string") return u;
  }
  return null;
}

function getGrowCoachMeta(scan: {
  result_payload?: unknown;
  result?: unknown;
}) {
  const r = (scan?.result_payload ?? scan?.result) as
    | { phase?: string; scale?: string; plan?: { confidence?: number } }
    | undefined;
  if (!r) return { phase: null, scale: null, conf: null };
  const phase = r.phase ?? null;
  const scale = r.scale ?? null;
  const conf = r.plan?.confidence ?? null;
  return { phase, scale, conf };
}

function daysSince(isoDate?: string | null): number | null {
  if (!isoDate) return null;
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return null;
  const now = Date.now();
  const diffMs = now - then;
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function getLatestCreatedAt(
  items: { created_at?: string; createdAt?: string }[]
): string | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  let best: string | null = null;
  for (const s of items) {
    const t = s?.created_at ?? s?.createdAt;
    if (typeof t === "string" && (!best || new Date(t) > new Date(best))) {
      best = t;
    }
  }
  return best;
}

/** Same robust v1 detection as history detail: version only, no strict shape. */
function isV1Payload(p: unknown): boolean {
  return !!p && typeof p === "object" && (p as { version?: string }).version === "1.0";
}

async function getScanHistory(): Promise<{
  scans: Array<{ id: string; created_at?: string; result_payload?: unknown; image_url?: string | null }>;
  lastActiveAt: string | null;
}> {
  try {
    const supabase = createServerClient();
    if (!supabase) return { scans: [], lastActiveAt: null };
    const gardenId = await getPublicGardenId(supabase);

    const [scansRes, gardenRes] = await Promise.all([
      supabase
        .from("scans")
        .select("id, created_at, result_payload, image_url")
        .eq("garden_id", gardenId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("gardens")
        .select("last_active_at")
        .eq("id", gardenId)
        .maybeSingle(),
    ]);

    if (scansRes.error) {
      console.error("Error fetching scan history:", scansRes.error);
      return { scans: [], lastActiveAt: null };
    }

    const rows = (scansRes.data || []) as Array<{
      id: string;
      created_at?: string;
      result_payload?: unknown;
      image_url?: string | null;
    }>;

    const lastActiveAt =
      gardenRes.data && typeof (gardenRes.data as { last_active_at?: string }).last_active_at === "string"
        ? (gardenRes.data as { last_active_at: string }).last_active_at
        : null;

    return { scans: rows, lastActiveAt };
  } catch (err) {
    console.error("Error fetching scan history:", err);
    return { scans: [], lastActiveAt: null };
  }
}

function displayName(scan: { primary_name?: string | null; result_payload?: unknown }): string {
  const { label } = getScanPrimaryLabel(scan);
  return label === "Scan" ? "Unverified Cultivar" : label;
}

function displayConfidence(scan: { confidence?: number | null; result_payload?: unknown }): number | null {
  if (isV1Payload(scan.result_payload)) {
    try {
      const c = (scan.result_payload as { primary_match?: { confidence?: number } })?.primary_match?.confidence;
      if (typeof c === "number" && Number.isFinite(c)) return Math.round(c * 100);
    } catch (_) {}
    return null;
  }
  if (scan.confidence != null) {
    return scan.confidence <= 1 ? Math.round(scan.confidence * 100) : Math.round(scan.confidence);
  }
  return null;
}

/** Tier for Scan Result UX contract: >= 75% High, >= 45% Medium, else Low. Same for v1 and legacy. */
function confidenceTier(pct: number): "High" | "Medium" | "Low" {
  if (pct >= 75) return "High";
  if (pct >= 45) return "Medium";
  return "Low";
}

export default async function HistoryPage() {
  const { scans, lastActiveAt } = await getScanHistory();
  const displayableScans = scans.filter((s) => !isActivityPing(s));
  const latestScan = getLatestCreatedAt(scans);
  const latestActivity = [latestScan, lastActiveAt].filter(Boolean) as string[];
  const latest = latestActivity.length > 0
    ? latestActivity.reduce((a, b) => (new Date(a) > new Date(b) ? a : b))
    : null;
  const gap = daysSince(latest ?? undefined);

  return (
    <>
      <TopNav title="Log Book" showBack />
      <main className="min-h-screen bg-black text-white">
        <div className="w-full py-6">
          {gap !== null && gap >= 1 ? (
            <div className="rounded-xl border border-white/15 bg-white/[0.06] shadow-lg shadow-black/20 p-4 mb-6">
              <div className="text-base font-black">Catch-up check</div>
              <p className="mt-2 text-white/90">
                You haven&apos;t logged anything in <b>{gap}</b> day{gap === 1 ? "" : "s"}.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/garden/grow-coach"
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-bold text-white no-underline hover:bg-white/[0.1] hover:border-white/20 transition-colors"
                >
                  Open Grow Coach
                </Link>
                <Link
                  href="/garden/scanner"
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-bold text-white no-underline hover:bg-white/[0.1] hover:border-white/20 transition-colors"
                >
                  Scan a Photo
                </Link>
              </div>
              <p className="mt-3 text-xs text-white/70">
                Tip: Get a plan from Grow Coach, then save it here.
              </p>
            </div>
          ) : null}
          {displayableScans.length === 0 ? (
            <div className="text-center py-14">
              <p className="text-white/80 text-lg font-semibold">No scans yet</p>
              <p className="text-white/60 text-sm mt-2">
                Your scan history will appear here
              </p>
              <Link
                href="/garden/scanner"
                className="mt-5 inline-flex items-center justify-center min-h-[44px] rounded-xl border border-white/15 bg-white/[0.06] px-5 py-2.5 text-white font-bold shadow-lg shadow-black/20 hover:bg-white/[0.1] hover:border-white/20 transition-colors"
              >
                Scan a Photo
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {displayableScans.map((scan) => (
                <Link
                  key={scan.id}
                  href={`/garden/history/${scan.id}`}
                  className="block rounded-xl border border-white/15 bg-white/[0.06] p-4 shadow-lg shadow-black/20 hover:bg-white/[0.08] hover:border-white/20 transition-colors cursor-pointer min-h-[44px]"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {(() => {
                      const thumb = getHistoryImageUrl(scan);
                      if (!thumb || isCoachEntry(scan)) return null;
                      return (
                        <img
                          src={thumb}
                          alt=""
                          className="flex-shrink-0 w-16 h-16 rounded-xl object-cover border border-white/12 bg-black/25"
                        />
                      );
                    })()}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h3 className="text-white font-semibold text-base sm:text-lg line-clamp-2">
                        {displayName(scan)}
                      </h3>
                      {(() => {
                        const pct = displayConfidence(scan);
                        if (pct == null) {
                          return <p className="text-white/50 text-sm mt-1">—</p>;
                        }
                        const tier = confidenceTier(pct);
                        return (
                          <p className="text-white/70 text-sm mt-1">
                            {tier} confidence
                            <span className="text-white/50 text-xs ml-1">({pct}%)</span>
                          </p>
                        );
                      })()}
                      {isGrowCoachPlan(scan) ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs font-extrabold">
                            Grow Coach
                          </span>
                          {(() => {
                            const m = getGrowCoachMeta(scan);
                            return (
                              <>
                                {m.phase ? (
                                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs font-bold">
                                    Phase: {String(m.phase)}
                                  </span>
                                ) : null}
                                {m.scale ? (
                                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs font-bold">
                                    Scale: {String(m.scale)}
                                  </span>
                                ) : null}
                                {typeof m.conf === "number" ? (
                                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs font-bold">
                                    Confidence: {Math.round(m.conf * 100)}%
                                  </span>
                                ) : null}
                              </>
                            );
                          })()}
                        </div>
                      ) : null}
                    </div>
                    {scan.created_at && (
                      <p className="text-white/50 text-xs whitespace-nowrap flex-shrink-0">
                        {new Date(scan.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
