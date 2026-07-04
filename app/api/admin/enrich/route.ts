// app/api/admin/enrich/route.ts — owner-triggered strain-library enrichment.
//
// GET  — enrichment stats (described / enriched / total).
// POST — run one batch (~10 strains ≈ 1-2¢) inside the deployed app, where
//        the OpenAI key lives. The Admin console's auto-run loop calls this
//        repeatedly until the library is filled.

import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/ownerGate";
import { enrichBatch, enrichmentStats } from "@/lib/strains/enrichCore";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const gate = await requireOwner(req);
  if (gate.ok === false) return gate.response;
  try {
    return NextResponse.json(await enrichmentStats());
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireOwner(req);
  if (gate.ok === false) return gate.response;
  try {
    const result = await enrichBatch(10);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}
