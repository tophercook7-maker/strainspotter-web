import { NextResponse } from "next/server";
import { localOnly, readScrapeTargets, slugify, writeJson, SCRAPE_TARGETS_PATH } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blocked = localOnly();
  if (blocked) return blocked;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ status: "error", error: "Invalid scrape targets payload." }, { status: 400 });
  }

  const current = await readScrapeTargets();
  const selectedStrains = Array.isArray(body.selectedStrains)
    ? body.selectedStrains.map(slugify).filter(Boolean)
    : current.selectedStrains;
  const next = {
    ...current,
    active: body.active ?? current.active,
    mode: body.mode ?? current.mode,
    maxImagesPerStrain: Math.max(1, Number(body.maxImagesPerStrain ?? current.maxImagesPerStrain ?? 25)),
    maxPagesPerRun: Math.max(1, Number(body.maxPagesPerRun ?? current.maxPagesPerRun ?? 100)),
    clusters: body.clusters ?? current.clusters,
    selectedStrains: Array.from(new Set(selectedStrains)),
  };

  await writeJson(SCRAPE_TARGETS_PATH, next);
  return NextResponse.json({ status: "success", scrapeTargets: next });
}
