import { NextResponse } from "next/server";
import {
  SOURCE_REGISTRY_PATH,
  localOnly,
  readJson,
  sourceSetupIssues,
  writeJson,
} from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blocked = localOnly();
  if (blocked) return blocked;

  const body = await request.json().catch(() => null);
  const sourceId = String(body?.sourceId ?? "");
  const enabled = body?.enabled === true;
  if (!sourceId) {
    return NextResponse.json({ status: "error", error: "Missing source id." }, { status: 400 });
  }

  const registry = await readJson<{ version?: number; sources?: any[] }>(SOURCE_REGISTRY_PATH, {
    version: 1,
    sources: [],
  });
  const sources = Array.isArray(registry.sources) ? registry.sources : [];
  const source = sources.find((item) => item.id === sourceId);
  if (!source) {
    return NextResponse.json({ status: "error", error: "Source not found." }, { status: 404 });
  }

  if (enabled && sourceSetupIssues(source).length > 0) {
    return NextResponse.json(
      { status: "error", error: "This source is missing setup info.", issues: sourceSetupIssues(source) },
      { status: 400 }
    );
  }

  const next = {
    ...registry,
    sources: sources.map((item) => (item.id === sourceId ? { ...item, enabled } : item)),
  };
  await writeJson(SOURCE_REGISTRY_PATH, next);
  return NextResponse.json({ status: "success", source: { ...source, enabled } });
}
