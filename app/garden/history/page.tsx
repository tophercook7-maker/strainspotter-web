import TopNav from "../_components/TopNav";
import { createServerClient } from "../../_server/supabase/server";
import Link from "next/link";

async function getScanHistory(strainFilter?: string) {
  try {
    const supabase = createServerClient();
    
    let query = supabase
      .from("scans")
      .select("id, primary_name, confidence, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    // Filter by strain if provided
    if (strainFilter) {
      query = query.ilike("primary_name", strainFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching scan history:", error);
      return [];
    }

    return data || [];
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
                        {scan.primary_name || "Unknown Strain"}
                      </h3>
                      {scan.confidence !== null && (
                        <p className="text-white/70 text-sm mt-1">
                          {Math.round(scan.confidence)}% confidence
                        </p>
                      )}
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
