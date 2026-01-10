import "server-only";

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scanId = searchParams.get("scan_id");

  // Stubbed response; no ML or dataset access yet.
  if (!scanId) {
    return NextResponse.json({
      descriptors: [],
      confidence: "observational",
    });
  }

  return NextResponse.json({
    descriptors: [
      "Leaf margin curl under sustained light exposure",
      "Surface texture often seen in late vegetative growth",
      "Color distribution typical of nitrogen-rich environments",
    ],
    confidence: "observational",
  });
}

