import Link from "next/link";
import TopNav from "../../_components/TopNav";
import { createServerClient } from "../../../_server/supabase/server";
import WikiStyleResultPanel from "../../scanner/WikiStyleResultPanel";
import { getUserTierFlags } from "@/lib/flags";
import type { FullScanResult } from "@/lib/scanner/types";
import {
  apiScanSummaryFromStoredResult,
  primaryStrainLabelFromStoredResult,
  topConfidenceFromStoredResult,
} from "@/lib/scanner/savedScanMappers";
import { compareScansPath } from "@/lib/scanner/savedScanNav";

type PageProps = {
  params: Promise<{ id: string }>;
};

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

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const scan = await getScanById(id);

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
  const primaryLabel =
    primaryStrainLabelFromStoredResult(scan.result) ?? undefined;
  const topConfidence = topConfidenceFromStoredResult(scan.result);
  const apiSummaryLine = apiScanSummaryFromStoredResult(scan.result);
  
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
    const fallback = buildSafeFallbackResult("Historical scan data", 1, primaryLabel || "Unknown Strain");
    
    // TypeScript knows fallback is ScanResult, need to narrow to success/partial
    if ('status' in fallback && (fallback.status === 'success' || fallback.status === 'partial')) {
      fullScanResult = {
        result: fallback.result,
        analysis: (fallback as any).analysis,
      };
      
      // Override with available database fields
      if (primaryLabel) {
        fullScanResult.result.name = primaryLabel;
        fullScanResult.result.title = primaryLabel;
        if (fullScanResult.result.nameFirstDisplay) {
          fullScanResult.result.nameFirstDisplay.primaryStrainName = primaryLabel;
          fullScanResult.result.nameFirstDisplay.primaryName = primaryLabel;
        }
      }
      if (topConfidence !== null) {
        fullScanResult.result.confidence = topConfidence;
        if (fullScanResult.result.nameFirstDisplay) {
          fullScanResult.result.nameFirstDisplay.confidencePercent = topConfidence;
          fullScanResult.result.nameFirstDisplay.confidence = topConfidence;
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
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-white/50">
            <div>
              {scan.created_at && (
                <p>Scanned on {new Date(scan.created_at).toLocaleString()}</p>
              )}
            </div>
            <Link
              href={compareScansPath(String(scan.id))}
              className="inline-flex w-fit items-center rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/90 hover:bg-white/10 hover:border-white/25 transition-colors"
            >
              Compare with another scan
            </Link>
          </div>

          {apiSummaryLine && (
            <div className="mb-6 rounded-xl border border-green-500/25 bg-green-500/10 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-green-200/80 mb-2">
                Scan summary
              </p>
              <p className="text-sm text-white/90 leading-relaxed">{apiSummaryLine}</p>
            </div>
          )}

          {/* Full scan result display */}
          <WikiStyleResultPanel result={fullScanResult} flags={flags} />
        </div>
      </main>
    </>
  );
}
