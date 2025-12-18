import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const res = await fetch(
      `https://strainspotter.onrender.com/api/strains/detail/${slug}`
    );

    if (!res.ok) {
      throw new Error(`API returned ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    return NextResponse.json(json);
  } catch (err: any) {
    console.error("[API ERROR]", err);
    return NextResponse.json(
      { error: `Strain '${slug}' not found` },
      { status: 404 }
    );
  }
}
