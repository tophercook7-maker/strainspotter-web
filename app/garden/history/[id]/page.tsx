import TopNav from "../../_components/TopNav";
import { createServerClient } from "../../../_server/supabase/server";
import WikiStyleResultPanel from "../../scanner/WikiStyleResultPanel";
import { getUserTierFlags } from "@/lib/flags";
import type { FullScanResult } from "@/lib/scanner/types";
import { resultPayloadToFullScanResult } from "@/lib/scanner/resultPayloadAdapter";

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

  // Prefer canonical backend result_payload when present (v1 by version only); else legacy scan.result
  const maybePayload = (scan as any).result_payload ?? (scan as any).resultPayload ?? null;
  const isV1 = !!maybePayload && typeof maybePayload === "object" && (maybePayload as any).version === "1.0";
  let fullScanResult: FullScanResult;

  if (isV1) {
    try {
      fullScanResult = {
        result: resultPayloadToFullScanResult(maybePayload as any) as unknown as FullScanResult["result"],
        analysis: undefined,
      };
    } catch {
      // Malformed v1: minimal safe view model so we never fall back to legacy scan.result
      fullScanResult = {
        result: {
          name: "Unverified Cultivar",
          confidence: 0,
          nameFirstDisplay: {
            primaryStrainName: "Unverified Cultivar",
            confidencePercent: 0,
            alternateMatches: [],
          },
          confidenceTier: { label: "Low", key: "low" },
        } as unknown as FullScanResult["result"],
        analysis: undefined,
      };
    }
  } else {
    // Reconstruct FullScanResult from stored data (legacy)
    const storedResult = scan.result as any;
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
      const { buildSafeFallbackResult } = await import("@/lib/scanner/scanFallbacks");
      const fallback = buildSafeFallbackResult("Historical scan data", 1, scan.primary_name || "Unknown Strain");
      if ('status' in fallback && (fallback.status === 'success' || fallback.status === 'partial')) {
        fullScanResult = {
          result: fallback.result,
          analysis: (fallback as any).analysis,
        };
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
        throw new Error("Unable to reconstruct scan result");
      }
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
