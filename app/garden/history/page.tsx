import TopNav from "../_components/TopNav";
import ZoneNav from "../_components/ZoneNav";
import { createServerClient } from "../../_server/supabase/server";
import Link from "next/link";
import HistoryList from "./_components/HistoryList";

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
          <ZoneNav zone="scan" zoneLabel="Scan" />
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
            <HistoryList scans={scans} />
          )}
        </div>
      </main>
    </>
  );
}
