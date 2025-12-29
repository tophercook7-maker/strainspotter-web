import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import "server-only";
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("inventory")
    .select(
      `
      id,
      name,
      strain_type,
      quantity,
      low_stock_threshold,
      batch_id,
      batch:batches (
        expires_on,
        production_run,
        remaining_units
      )
    `
    )
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ items: data });
}
