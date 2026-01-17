import { NextResponse } from "next/server";

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
