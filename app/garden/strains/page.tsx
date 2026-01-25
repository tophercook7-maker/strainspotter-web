import TopNav from "../_components/TopNav";
import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";

type ScanRow = {
  id: string;
  primary_name: string | null;
  confidence: number | null;
  created_at: string;
};

type StrainStats = {
  name: string;
  scanCount: number;
  avgConfidence: number;
  lastSeen: string;
};

async function getStrainStats(): Promise<StrainStats[]> {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from("scans")
      .select("id, primary_name, confidence, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Error fetching scans:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Group by primary_name
    const strainMap = new Map<string, {
      scans: ScanRow[];
      totalConfidence: number;
      confidenceCount: number;
      latestDate: string;
    }>();

    for (const scan of data) {
      const name = scan.primary_name || "Unknown Strain";
      
      if (!strainMap.has(name)) {
        strainMap.set(name, {
          scans: [],
          totalConfidence: 0,
          confidenceCount: 0,
          latestDate: scan.created_at,
        });
      }

      const stats = strainMap.get(name)!;
      stats.scans.push(scan);
      
      if (scan.confidence !== null) {
        stats.totalConfidence += scan.confidence;
        stats.confidenceCount++;
      }

      // Track latest date
      if (scan.created_at > stats.latestDate) {
        stats.latestDate = scan.created_at;
      }
    }

    // Convert to array and compute averages
    const results: StrainStats[] = Array.from(strainMap.entries())
      .map(([name, stats]) => ({
        name,
        scanCount: stats.scans.length,
        avgConfidence: stats.confidenceCount > 0
          ? Math.round((stats.totalConfidence / stats.confidenceCount) * 10) / 10
          : 0,
        lastSeen: stats.latestDate,
      }))
      .sort((a, b) => {
        // Sort by scan count (desc), then by last seen (desc)
        if (b.scanCount !== a.scanCount) {
          return b.scanCount - a.scanCount;
        }
        return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
      });

    return results;
  } catch (err) {
    console.error("Error fetching strain stats:", err);
    return [];
  }
}

export default async function StrainsPage() {
  const strains = await getStrainStats();

  return (
    <>
      <TopNav title="Strains" showBack />
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          {strains.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/70 text-lg">No strains yet</p>
              <p className="text-white/50 text-sm mt-2">
                Scan some plants to see identified strains here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {strains.map((strain) => (
                <Link
                  key={strain.name}
                  href={`/garden/history?strain=${encodeURIComponent(strain.name)}`}
                  className="block rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-white/20 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg">
                        {strain.name}
                      </h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-white/70">
                        <span>{strain.scanCount} scan{strain.scanCount !== 1 ? 's' : ''}</span>
                        {strain.avgConfidence > 0 && (
                          <span>{strain.avgConfidence}% avg confidence</span>
                        )}
                      </div>
                    </div>
                    <p className="text-white/50 text-xs whitespace-nowrap">
                      {new Date(strain.lastSeen).toLocaleDateString()}
                    </p>
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
