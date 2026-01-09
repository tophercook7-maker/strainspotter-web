import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { allowAI, enforceCalmTone } from "@/lib/ai/guard";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { thc, cbd, terpenes = [], lab, batch } = body || {};

    if (!allowAI({ kind: "chat", userAsked: true })) {
      return NextResponse.json({ error: "ai_not_allowed" }, { status: 403 });
    }

    const parts: string[] = [];
    const thcNum = parseFloat(thc) || null;
    const cbdNum = parseFloat(cbd) || null;

    parts.push("This summary is educational and not medical advice.");

    if (thcNum !== null) {
      if (thcNum >= 20) parts.push(`THC is reported near ${thc}% which is common for higher potency flower.`);
      else if (thcNum >= 10) parts.push(`THC is reported near ${thc}% which sits in a moderate range.`);
      else parts.push(`THC is reported near ${thc}%, a lighter range some consumers prefer for gentler effects.`);
    } else {
      parts.push("THC was not provided; potency cannot be inferred from this field alone.");
    }

    if (cbdNum !== null) {
      if (cbdNum >= 10) parts.push(`CBD is around ${cbd}% which is typical of CBD-forward products.`);
      else if (cbdNum > 0) parts.push(`CBD is around ${cbd}% which may balance the overall profile in some products.`);
      else parts.push("CBD is not present or not reported; this profile focuses on THC.");
    } else {
      parts.push("CBD was not provided; the balance between THC and CBD is unclear.");
    }

    const terpList = Array.isArray(terpenes)
      ? terpenes.filter((t: any) => t?.name).map((t: any) => `${t.name} ${t.percent ? `(${t.percent}%)` : ""}`.trim())
      : [];
    if (terpList.length) {
      parts.push(`Terpenes listed: ${terpList.join(", ")}. These describe aroma and character; values shown as reported.`);
    } else {
      parts.push("No terpenes were listed; aroma and character are not described here.");
    }

    if (lab || batch) {
      parts.push(
        `Reported by ${lab || "the lab"}${batch ? ` for batch/lot ${batch}` : ""}; lab and batch fields help trace provenance.`
      );
    }

    parts.push("Reading a COA: note potency, terpene distribution, and provenance. Use multiple data points to understand the product.");

    const reply = enforceCalmTone(parts.join(" "));
    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("[coa/explain] error", err);
    return NextResponse.json({ error: err.message || "failed" }, { status: 500 });
  }
}

