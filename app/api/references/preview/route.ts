import path from "node:path";
import fs from "node:fs";
import { NextRequest, NextResponse } from "next/server";
import { resolveSafePreviewPath } from "@/lib/server/referenceImagesJsonl";

export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get("localPath");
    if (!raw) {
      return NextResponse.json({ error: "localPath required" }, { status: 400 });
    }
    const abs = resolveSafePreviewPath(raw);
    if (!abs) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const ext = path.extname(abs).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : ext === ".gif"
            ? "image/gif"
            : "image/jpeg";
    const buf = fs.readFileSync(abs);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=120",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
