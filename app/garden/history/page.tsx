import TopNav from "../_components/TopNav";
import { createServerClient } from "../../_server/supabase/server";
import Link from "next/link";

/** Same robust v1 detection as history detail: version only, no strict shape. */
function isV1Payload(p: unknown): boolean {
  return !!p && typeof p === "object" && (p as { version?: string }).version === "1.0";
}

async function getScanHistory(strainFilter?: string) {
  try {
    const supabase = createServerClient();

    // Fetch unfiltered so we can match both legacy (primary_name) and v1 (result_payload) rows.
    // Filter is applied client-side using displayName() so v1 rows are included.
    const { data, error } = await supabase
      .from("scans")
      .select("id, created_at, primary_name, confidence, result_payload")
      .order("created_at", { ascending: false })
      .limit(strainFilter ? 200 : 20);

    if (error) {
      console.error("Error fetching scan history:", error);
      return [];
    }

    const rows = data || [];
    if (!strainFilter) return rows;

    const term = strainFilter.toLowerCase();
    return rows.filter((scan) => displayName(scan).toLowerCase().includes(term));
  } catch (err) {
    console.error("Error fetching scan history:", err);
    return [];
  }
}

function displayName(scan: { primary_name?: string | null; result_payload?: unknown }): string {
  if (isV1Payload(scan.result_payload)) {
    try {
      const name = (scan.result_payload as { primary_match?: { strain_name?: string } })?.primary_match?.strain_name;
      if (typeof name === "string" && name.trim()) return name.trim();
    } catch (_) {}
    return "Unverified Cultivar";
  }
  if (scan.primary_name) return scan.primary_name;
  return "Unverified Cultivar";
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

export default async function HistoryPage({
  searchParams,
}: {
  searchParams?: { strain?: string };
}) {
  const strainFilter = searchParams?.strain;
  const scans = await getScanHistory(strainFilter);

  return (
    <>
      <TopNav title="History" showBack />
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          {strainFilter && (
            <div className="mb-4 rounded-lg border border-white/15 bg-white/10 p-3 flex items-center justify-between">
              <span className="text-white/80 text-sm">
                Filtered by: <span className="font-semibold text-white">{strainFilter}</span>
              </span>
              <Link
                href="/garden/history"
                className="text-white/80 hover:text-white text-sm underline"
              >
                Clear
              </Link>
            </div>
          )}
          {scans.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/70 text-lg">
                {strainFilter ? `No scans found for "${strainFilter}"` : "No scans yet"}
              </p>
              <p className="text-white/50 text-sm mt-2">
                {strainFilter
                  ? "Try a different strain or clear the filter"
                  : "Your scan history will appear here"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {scans.map((scan) => (
                <Link
                  key={scan.id}
                  href={`/garden/history/${scan.id}`}
                  className="block rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-white/20 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg">
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
                    </div>
                    {scan.created_at && (
                      <p className="text-white/50 text-xs whitespace-nowrap">
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
