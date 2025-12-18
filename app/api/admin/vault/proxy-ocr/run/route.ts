/**
 * POST /api/admin/vault/proxy-ocr/run
 * Run proxy image and OCR pipeline for strains
 * Admin-only endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/adminAuth";
import fs from "fs";
import path from "path";
import { VAULT_RAW_ROOT } from "@/lib/vault/config";
import { updateManifestWithProxyAndOCR } from "@/lib/vault/manifestUpdate";

export async function POST(req: NextRequest) {
  try {
    // Require admin authentication
    await requireAdminAPI();

    const body = await req.json().catch(() => ({}));
    const limit = body.limit ? Number(body.limit) : undefined;
    const ocrOnly = body.ocrOnly === true;

    if (!fs.existsSync(VAULT_RAW_ROOT)) {
      return NextResponse.json(
        { error: `Vault raw root not found: ${VAULT_RAW_ROOT}` },
        { status: 404 }
      );
    }

    let slugs: string[];
    try {
      slugs = fs.readdirSync(VAULT_RAW_ROOT).filter((entry) => {
        const fullPath = path.join(VAULT_RAW_ROOT, entry);
        try {
          return fs.statSync(fullPath).isDirectory();
        } catch {
          return false;
        }
      });
    } catch (error) {
      console.error("[admin/vault/proxy-ocr/run] Error reading vault root:", error);
      return NextResponse.json(
        { error: "Failed to read vault root directory" },
        { status: 500 }
      );
    }

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    console.log(
      `[admin/vault/proxy-ocr/run] Processing ${slugs.length} strains${limit ? ` (limit: ${limit})` : ""}${ocrOnly ? " (OCR only)" : ""}`
    );

    for (const slug of slugs) {
      try {
        const result = await updateManifestWithProxyAndOCR(slug, { ocrOnly });
        if (result) {
          succeeded++;
        } else {
          failed++;
        }
        processed++;

        if (limit && processed >= limit) {
          break;
        }

        // Log progress every 50 strains
        if (processed % 50 === 0) {
          console.log(
            `[admin/vault/proxy-ocr/run] Progress: ${processed}/${slugs.length} (${succeeded} succeeded, ${failed} failed)`
          );
        }
      } catch (error) {
        console.error(`[admin/vault/proxy-ocr/run] Error processing ${slug}:`, error);
        failed++;
        processed++;
      }
    }

    console.log(
      `[admin/vault/proxy-ocr/run] Complete: ${succeeded} succeeded, ${failed} failed`
    );

    return NextResponse.json({
      ok: true,
      processed,
      succeeded,
      failed,
      total: slugs.length,
      ocrOnly,
      message: `Processed ${processed} strains (${succeeded} succeeded, ${failed} failed)${ocrOnly ? " - OCR only" : ""}`,
    });
  } catch (error: any) {
    console.error("[admin/vault/proxy-ocr/run] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to run proxy-OCR pipeline" },
      { status: error.message?.includes("Admin") ? 403 : 500 }
    );
  }
}
