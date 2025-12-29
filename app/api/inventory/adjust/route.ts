import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import "server-only";
type AdjustPayload = {
  inventory_id: string;
  delta: number; // negative for sale/use, positive for restock
  reason?: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as AdjustPayload;

  if (!body.inventory_id || typeof body.delta !== 'number') {
    return NextResponse.json(
      { error: "inventory_id and delta are required" },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1) Get current inventory + batch
  const { data: inv, error: invError } = await supabase
    .from("grower_inventory")
    .select("id, units_available, batch_id")
    .eq("id", body.inventory_id)
    .single();

  if (invError || !inv) {
    return NextResponse.json(
      { error: "Inventory item not found" },
      { status: 404 }
    );
  }

  const newQuantity = (inv.units_available || 0) + body.delta;

  if (newQuantity < 0) {
    return NextResponse.json(
      { error: "Cannot reduce inventory below zero" },
      { status: 400 }
    );
  }

  // 2) Update inventory quantity
  const { error: updateError } = await supabase
    .from("grower_inventory")
    .update({ 
      units_available: newQuantity,
      updated_at: new Date().toISOString()
    })
    .eq("id", body.inventory_id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 400 }
    );
  }

  // 3) Log batch event (optional but recommended)
  if (inv.batch_id) {
    await supabase.from("batch_events").insert({
      batch_id: inv.batch_id,
      event_type: body.delta < 0 ? "decrement" : "increment",
      event_data: {
        delta: body.delta,
        reason: body.reason || "manual adjustment",
        inventory_id: body.inventory_id,
      },
    });
  }

  // Trigger will automatically update batches.remaining_units
  return NextResponse.json({ success: true, newQuantity });
}
