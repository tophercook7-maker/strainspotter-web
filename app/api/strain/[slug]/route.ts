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
    
    // Ensure seed_sources is preserved in response
    // Log to verify it exists in backend response
    if (json) {
      console.log('[STRAIN API] Backend response includes seed_sources:', {
        hasSeedSources: !!json.seed_sources,
        seedSourcesType: typeof json.seed_sources,
        seedSourcesValue: json.seed_sources,
      });
    }
    
    // Explicitly preserve seed_sources field
    const response = {
      ...json,
      seed_sources: json.seed_sources ?? null, // Preserve null/undefined, don't drop the field
    };
    
    return NextResponse.json(response);
  } catch (err: any) {
    console.error("[API ERROR]", err);
    return NextResponse.json(
      { error: `Strain '${slug}' not found` },
      { status: 404 }
    );
  }
}
