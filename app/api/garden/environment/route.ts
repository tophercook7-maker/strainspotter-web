import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { searchParams } = new URL(req.url);
    const garden_id = searchParams.get("garden_id");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (!garden_id) {
      return NextResponse.json({ error: "garden_id required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("garden_environment_logs")
      .select("*")
      .eq("garden_id", garden_id)
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ logs: data || [] });
  } catch (err: any) {
    console.error("GET GARDEN ENVIRONMENT ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const body = await req.json();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { garden_id, temperature, humidity, vpd, notes } = body;

    if (!garden_id) {
      return NextResponse.json({ error: "garden_id required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("garden_environment_logs")
      .insert({
        garden_id,
        user_id: user.id,
        temperature: temperature ? parseFloat(temperature) : null,
        humidity: humidity ? parseFloat(humidity) : null,
        vpd: vpd ? parseFloat(vpd) : null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ log: data });
  } catch (err: any) {
    console.error("POST GARDEN ENVIRONMENT ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
