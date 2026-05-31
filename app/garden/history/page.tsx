import TopNav from "../_components/TopNav";
import { createServerClient } from "../../_server/supabase/server";
import Link from "next/link";
import {
  historyListSubtitleFromStoredResult,
  primaryStrainLabelFromStoredResult,
  topConfidenceFromStoredResult,
} from "@/lib/scanner/savedScanMappers";
import SSBadge from "@/components/ui/SSBadge";
import SSCard from "@/components/ui/SSCard";
import SSEmptyState from "@/components/ui/SSEmptyState";
import SSNotice from "@/components/ui/SSNotice";
import SSSectionHeader from "@/components/ui/SSSectionHeader";

type HistoryListRow = {
  id: string;
  primary_name: string | null;
  confidence: number | null;
  created_at: string | null;
  /** Truncated API summary when stored (optional second line). */
  subtitle: string | null;
};

async function getScanHistory(strainFilter?: string): Promise<HistoryListRow[]> {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("scans")
      .select("id, created_at, result")
      .order("created_at", { ascending: false })
      .limit(strainFilter ? 100 : 20);

    if (error) {
      console.error("Error fetching scan history:", error);
      return [];
    }

    const rows = (data || []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      primary_name: primaryStrainLabelFromStoredResult(row.result),
      confidence: topConfidenceFromStoredResult(row.result),
      created_at: (row.created_at as string) ?? null,
      subtitle: historyListSubtitleFromStoredResult(row.result),
    }));

    if (!strainFilter?.trim()) {
      return rows;
    }

    const f = strainFilter.trim().toLowerCase();
    return rows.filter((r) =>
      (r.primary_name || "").toLowerCase().includes(f)
    );
  } catch (err) {
    console.error("Error fetching scan history:", err);
    return [];
  }
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
          <SSSectionHeader
            eyebrow="Scan memory"
            title="History"
            description="Reopen saved IDs, compare look-alike results, and track how confidence changes across photos."
            style={{ marginBottom: 20 }}
          />
          {strainFilter && (
            <SSNotice tone="info" style={{ marginBottom: 16 }}>
              <div className="flex items-center justify-between gap-3">
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
            </SSNotice>
          )}
          {scans.length === 0 ? (
            <SSEmptyState
              title={strainFilter ? `No scans found for "${strainFilter}"` : "No scans yet"}
              description={
                strainFilter
                  ? "Try a different strain or clear the filter"
                  : "Scan a flower photo and save the result to build your personal strain memory."
              }
              action={
                !strainFilter ? (
                <Link
                  href="/garden/scanner"
                  className="mt-5 inline-flex rounded-full bg-green-600 px-5 py-2 text-sm font-bold text-white hover:bg-green-500"
                >
                  Start a scan
                </Link>
                ) : null
              }
            />
          ) : (
            <div className="space-y-3">
              {scans.map((scan) => (
                <Link
                  key={scan.id}
                  href={`/garden/history/${scan.id}`}
                  className="block cursor-pointer text-inherit no-underline transition-opacity hover:opacity-90"
                >
                  <SSCard padding={16} style={{ boxShadow: "none" }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg">
                        {scan.primary_name || "Unknown Strain"}
                      </h3>
                      {scan.subtitle && (
                        <p className="text-white/45 text-sm mt-1 line-clamp-2 leading-snug">
                          {scan.subtitle}
                        </p>
                      )}
                      {scan.confidence !== null && (
                        <SSBadge tone="success" style={{ marginTop: 8 }}>
                          {Math.round(scan.confidence)}% confidence
                        </SSBadge>
                      )}
                    </div>
                    {scan.created_at && (
                      <p className="text-white/50 text-xs whitespace-nowrap">
                        {new Date(scan.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  </SSCard>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
