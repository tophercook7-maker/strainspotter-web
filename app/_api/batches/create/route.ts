import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import "server-only";
export async function POST(req: Request) {
  const body = await req.json();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "build-skip" }, { status: 200 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const batchCode =
    body.batch_code?.trim() ||
    "BATCH-" + Math.random().toString(36).substring(2, 8).toUpperCase();

  // default expiration = harvest + 12 months
  const expires = body.harvested_at
    ? new Date(new Date(body.harvested_at).setFullYear(
        new Date(body.harvested_at).getFullYear() + 1
      )).toISOString()
    : null;

  const { data, error } = await supabase
    .from("batches")
    .insert({
      strain: body.strain,
      batch_code: batchCode,
      harvested_at: body.harvested_at,
      cured_at: body.cured_at,
      total_units: body.total_units,
      remaining_units: body.total_units,
      thc: body.thc,
      cbd: body.cbd,
      notes: body.notes,
      expires_at: expires
    })
    .select("*")
    .single();

  if (error) {
    console.error("Batch creation failed:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ batch: data });
}
