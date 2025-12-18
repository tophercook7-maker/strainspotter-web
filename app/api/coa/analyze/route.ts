import { NextResponse } from "next/server";
import { CoaAnalysisResult } from "@/types/coa";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawText: string = body.rawText ?? "";
    const fileName: string | undefined = body.fileName;

    // TODO: In the future, call OpenAI / Vision / custom model here.

    const result: CoaAnalysisResult = {
      summary: {
        productName: "Commerce City Kush Live Resin",
        batchId: "CCK-2025-07-11",
        labName: "Rocky Mountain Analytics",
        testDate: "2025-07-11",
        strainName: "Commerce City Kush",
      },
      potency: {
        thcPercent: 82.4,
        cbdPercent: 0.3,
        minorCannabinoids: [
          { name: "CBG", percent: 1.2 },
          { name: "CBN", percent: 0.4 },
        ],
      },
      terpenes: {
        totalPercent: 6.1,
        topTerpenes: [
          { name: "Limonene", percent: 2.3 },
          { name: "Myrcene", percent: 1.8 },
          { name: "Caryophyllene", percent: 1.2 },
        ],
      },
      safety: {
        pesticidesPass: true,
        heavyMetalsPass: true,
        microbesPass: true,
        residualSolventsPass: true,
        notes: [
          "All analytes tested below state action limits.",
          "Sample meets Colorado MED compliance thresholds.",
        ],
      },
      aiSummary:
        "This batch of Commerce City Kush Live Resin is a high-THC, terpene-rich extract with clean safety results and no flagged contaminants.",
      recommendedUseCases: [
        "Evening relaxation",
        "High-tolerance consumers",
        "Concentrate enthusiasts seeking strong terpene profile",
      ],
      riskWarnings: [
        "Very potent; start with a very small dose.",
        "Not recommended for inexperienced consumers.",
      ],
    };

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("COA analysis error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to analyze COA." },
      { status: 500 }
    );
  }
}

