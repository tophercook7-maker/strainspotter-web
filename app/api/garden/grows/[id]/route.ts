/**
 * GET /api/garden/grows/[id]
 * PATCH /api/garden/grows/[id]
 * Get or update a specific grow
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const supabase = await createSupabaseServer();
    const { data, error } = await supabase
      .from("grows")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Grow not found" }, { status: 404 });
    }

    return NextResponse.json({ grow: data });
  } catch (error: any) {
    console.error("[garden/grows/id] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch grow" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const supabase = await createSupabaseServer();

    // Verify grow belongs to user
    const { data: existingGrow, error: checkError } = await supabase
      .from("grows")
      .select("id, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (checkError || !existingGrow) {
      return NextResponse.json({ error: "Grow not found" }, { status: 404 });
    }

    // Update grow
    const updates: any = {};
    if (body.name !== undefined) {
      updates.name = body.name.trim();
    }
    if (body.strain !== undefined) {
      updates.strain = body.strain?.trim() || null;
    }
    if (body.stage !== undefined) {
      const validStages = ["seed", "veg", "flower", "harvest"];
      if (validStages.includes(body.stage)) {
        updates.stage = body.stage;
      }
    }

    const { data, error } = await supabase
      .from("grows")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[garden/grows/id] Error updating grow:", error);
      return NextResponse.json(
        { error: "Failed to update grow" },
        { status: 500 }
      );
    }

    return NextResponse.json({ grow: data });
  } catch (error: any) {
    console.error("[garden/grows/id] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update grow" },
      { status: 500 }
    );
  }
}
