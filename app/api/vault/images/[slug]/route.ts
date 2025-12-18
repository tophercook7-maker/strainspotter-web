/**
 * GET /api/vault/images/[slug]
 * Serve proxy images from Vault processed dataset
 */

import { NextRequest, NextResponse } from "next/server";
import { readPublicImage } from "@/lib/vault/datasetRead";
import fs from "fs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const imagePath = readPublicImage(slug);
    if (!imagePath || !fs.existsSync(imagePath)) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Read image file
    const imageBuffer = fs.readFileSync(imagePath);
    const ext = imagePath.split(".").pop()?.toLowerCase() || "jpg";
    const contentType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
        ? "image/webp"
        : "image/jpeg";

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("[vault/images] Error serving image:", error);
    return NextResponse.json(
      { error: "Failed to serve image" },
      { status: 500 }
    );
  }
}
