import TopNav from "../../_components/TopNav";
import Link from "next/link";
import { createServerClient } from "../../../_server/supabase/server";
import WikiStyleResultPanel from "../../scanner/WikiStyleResultPanel";
import { getUserTierFlags } from "@/lib/flags";
import type { FullScanResult } from "@/lib/scanner/types";
import { resultPayloadToFullScanResult } from "@/lib/scanner/resultPayloadAdapter";
import { getScanPrimaryLabel } from "@/lib/scanPrimary";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getScanById(id: string) {
  try {
    const supabase = createServerClient();
    if (!supabase) return null;

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
            <Link
              href="/garden/history"
              className="mt-6 inline-block rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-white font-semibold hover:bg-white/20 transition"
            >
              Back to Log Book
            </Link>
          </div>
        </main>
      </>
    );
  }

  // Prefer canonical backend result_payload when present (v1 by version only); else legacy scan.result
  const maybePayload = (scan as Record<string, unknown>).result_payload ?? (scan as Record<string, unknown>).resultPayload ?? null;
  const payloadObj = maybePayload && typeof maybePayload === "object" ? maybePayload as Record<string, unknown> : null;
  const isGrowCoach = payloadObj?.kind === "grow_coach_plan";

  // Grow Coach plan: render structured plan UI instead of WikiStyleResultPanel
  if (isGrowCoach && payloadObj) {
    const r = payloadObj;
    const plan = (r.plan ?? {}) as Record<string, unknown>;
    const phase = r.phase as string | undefined;
    const scale = r.scale as string | undefined;
    const headline = (plan.headline as string) ?? "Grow Coach Plan";
    const flavor = plan.flavor as string | undefined;
    const actions = Array.isArray(plan.actions) ? (plan.actions as string[]) : [];
    const watchouts = Array.isArray(plan.watchouts) ? (plan.watchouts as string[]) : [];
    const questions = Array.isArray(plan.questions) ? (plan.questions as string[]) : [];
    const confidence = typeof plan.confidence === "number" ? plan.confidence : null;

    return (
      <>
        <TopNav title="Scan Details" showBack />
        <main className="min-h-screen bg-black text-white">
          <div className="mx-auto w-full max-w-[720px] px-4 py-6">
            <div className="mb-6 text-sm text-white/50">
              {scan.created_at && (
                <p>Saved on {new Date(scan.created_at).toLocaleString()}</p>
              )}
            </div>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-lg font-black">Saved Grow Coach Plan</div>
              <div className="mt-2 text-2xl font-extrabold">{headline}</div>
              {flavor ? <div className="mt-1 opacity-80">{flavor}</div> : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {phase ? (
                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs font-bold">
                    Phase: {String(phase)}
                  </span>
                ) : null}
                {scale ? (
                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs font-bold">
                    Scale: {String(scale)}
                  </span>
                ) : null}
                {confidence != null ? (
                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs font-bold">
                    Confidence: {Math.round(confidence * 100)}%
                  </span>
                ) : null}
              </div>

              {actions.length > 0 ? (
                <div className="mt-4">
                  <div className="font-black">Actions</div>
                  <ul className="mt-2 list-disc pl-5 opacity-90 space-y-1">
                    {actions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {watchouts.length > 0 ? (
                <div className="mt-4">
                  <div className="font-black">Watchouts</div>
                  <ul className="mt-2 list-disc pl-5 opacity-90 space-y-1">
                    {watchouts.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {questions.length > 0 ? (
                <div className="mt-4">
                  <div className="font-black">Questions</div>
                  <ul className="mt-2 list-disc pl-5 opacity-90 space-y-1">
                    {questions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          </div>
        </main>
      </>
    );
  }

  const isV1 = !!maybePayload && typeof maybePayload === "object" && (maybePayload as Record<string, unknown>).version === "1.0";
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
      const { label } = getScanPrimaryLabel(scan as any);
      const displayName = label === "Scan" ? "Unknown Strain" : label;
      const fallback = buildSafeFallbackResult("Historical scan data", 1, displayName);
      if ('status' in fallback && (fallback.status === 'success' || fallback.status === 'partial')) {
        fullScanResult = {
          result: fallback.result,
          analysis: (fallback as any).analysis,
        };
        fullScanResult.result.name = displayName;
        fullScanResult.result.title = displayName;
        if (fullScanResult.result.nameFirstDisplay) {
          fullScanResult.result.nameFirstDisplay.primaryStrainName = displayName;
          fullScanResult.result.nameFirstDisplay.primaryName = displayName;
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
