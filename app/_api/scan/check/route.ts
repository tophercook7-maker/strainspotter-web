import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      disabled: true,
      reason: "Scan check temporarily disabled during deployment"
    },
    { status: 200 }
  );
}
