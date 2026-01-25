import TopNav from "../../_components/TopNav";
import { createServerClient } from "@/app/lib/supabase/server";
import WikiStyleResultPanel from "../../scanner/WikiStyleResultPanel";
import { getUserTierFlags } from "@/lib/flags";
import type { FullScanResult } from "@/lib/scanner/types";

async function getScanById(id: string) {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from("scans")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  } catch (err) {
    console.error("Error fetching scan:", err);
    return null;
  }
}

export default async function ScanDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const scan = await getScanById(params.id);

  if (!scan) {
    return (
      <>
        <TopNav title="Scan Not Found" showBack />
        <main className="min-h-screen bg-black text-white">
          <div className="mx-auto w-full max-w-[720px] px-4 py-12 text-center">
            <p className="text-white/70 text-lg">Scan not found</p>
            <p className="text-white/50 text-sm mt-2">
              This scan may have been deleted or never existed.
            </p>
          </div>
        </main>
      </>
    );
  }

  // Reconstruct FullScanResult from stored data
  // The `result` field contains the full scan metadata (ScanResult or FullScanResult)
  const storedResult = scan.result as any;
  
  // If stored result already has the FullScanResult structure (with result.result), use it
  // Otherwise, if it's a ScanResult (with status and result), extract the result
  // Otherwise, create a minimal structure from database fields
  let fullScanResult: FullScanResult;
  
  if (storedResult && storedResult.result && typeof storedResult.result === 'object' && storedResult.result.name) {
    // Already a FullScanResult structure
    fullScanResult = storedResult as FullScanResult;
  } else if (storedResult && 'status' in storedResult && storedResult.status && storedResult.result) {
    // It's a ScanResult, extract the result
    fullScanResult = {
      result: storedResult.result,
      analysis: storedResult.analysis,
    };
  } else {
    // Fallback: create minimal structure from database fields
    // Import ScannerViewModel type for proper typing
    const { buildSafeFallbackResult } = await import("@/lib/scanner/scanFallbacks");
    const fallback = buildSafeFallbackResult("Historical scan data", 1, scan.primary_name || "Unknown Strain");
    
    // TypeScript knows fallback is ScanResult, need to narrow to success/partial
    if ('status' in fallback && (fallback.status === 'success' || fallback.status === 'partial')) {
      fullScanResult = {
        result: fallback.result,
        analysis: (fallback as any).analysis,
      };
      
      // Override with available database fields
      if (scan.primary_name) {
        fullScanResult.result.name = scan.primary_name;
        fullScanResult.result.title = scan.primary_name;
        if (fullScanResult.result.nameFirstDisplay) {
          fullScanResult.result.nameFirstDisplay.primaryStrainName = scan.primary_name;
          fullScanResult.result.nameFirstDisplay.primaryName = scan.primary_name;
        }
      }
      if (scan.confidence !== null) {
        fullScanResult.result.confidence = scan.confidence;
        if (fullScanResult.result.nameFirstDisplay) {
          fullScanResult.result.nameFirstDisplay.confidencePercent = scan.confidence;
          fullScanResult.result.nameFirstDisplay.confidence = scan.confidence;
        }
      }
    } else {
      // Should never happen, but satisfy TypeScript
      throw new Error("Unable to reconstruct scan result");
    }
  }

  const flags = getUserTierFlags();

  return (
    <>
      <TopNav title="Scan Details" showBack />
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          {/* Scan metadata header */}
          <div className="mb-6 text-sm text-white/50">
            {scan.created_at && (
              <p>Scanned on {new Date(scan.created_at).toLocaleString()}</p>
            )}
          </div>

          {/* Full scan result display */}
          <WikiStyleResultPanel result={fullScanResult} flags={flags} />
        </div>
      </main>
    </>
  );
}
