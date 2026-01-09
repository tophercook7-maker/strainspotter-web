import { NextResponse } from "next/server";
import { getGrowDoctorReport } from "@/lib/growDoctor/report";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const growId = searchParams.get("growId");
  const tier = (searchParams.get("tier") as "free" | "garden" | "pro" | null) ?? "free";

  if (!growId) {
    return NextResponse.json({ error: "growId required" }, { status: 400 });
  }

  try {
    const report = await getGrowDoctorReport(growId);
    const top = report.diagnoses[0];
    if (!top) {
      return NextResponse.json({ diagnosis: null, lastCheckedAt: report.lastCheckedAt });
    }

    const relation =
      top.status === "resolving"
        ? "improving"
        : top.status === "unresolved"
        ? "consistent"
        : "new";

    if (tier === "free") {
      return NextResponse.json({
        diagnosis: {
          summary: "Recent cultivation patterns reviewed.",
          confidence: top.confidence,
          relation,
          status: top.status ?? null,
        },
        lastCheckedAt: report.lastCheckedAt,
      });
    }

    return NextResponse.json({
      diagnosis: {
        title: top.title,
        confidence: top.confidence,
        relation,
        evidencePreview: top.evidence.slice(0, 2),
        status: top.status ?? null,
      },
      lastCheckedAt: report.lastCheckedAt,
    });
  } catch (err) {
    console.error("[GrowDoctor] insight API error", err);
    return NextResponse.json({ error: "insight_failed" }, { status: 500 });
  }
}

