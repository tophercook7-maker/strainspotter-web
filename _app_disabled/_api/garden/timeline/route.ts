import "server-only";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

type TimelineItem =
  | { type: "log"; id: string; text: string; created_at: string; tag?: string | null; label?: string | null; referenced_by_doctor?: boolean }
  | {
      type: "scan";
      id: string;
      created_at: string;
      summary: string;
      confidence?: number | null;
      image_url?: string | null;
      label?: string | null;
      referenced_by_doctor?: boolean;
    }
  | { type: "measurement"; id: string; created_at: string; mtype: string | null; value: number | null; unit: string | null; referenced_by_doctor?: boolean }
  | { type: "doctor"; id: string; created_at: string; title: string; confidence?: string | null; status?: string | null; referenced_by_doctor?: boolean };

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { searchParams } = new URL(req.url);
    const growId = searchParams.get("grow_id") || searchParams.get("garden_id");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (!growId) {
      return NextResponse.json({ error: "grow_id required" }, { status: 400 });
    }

    const [logsRes, scansRes, measurementsRes, outcomesRes] = await Promise.all([
      supabase
        .from("garden_logbook_entries")
        .select("id, created_at, text, entry_type")
        .eq("garden_id", growId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("scans")
        .select("id, created_at, match, image_url")
        .eq("grow_id", growId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("measurements")
        .select("id, created_at, type, value, unit")
        .eq("grow_id", growId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("grow_doctor_outcomes")
        .select("diagnosis_title, confidence, status, updated_at")
        .eq("grow_id", growId)
        .order("updated_at", { ascending: false })
        .limit(20),
    ]);

    if (logsRes.error) throw logsRes.error;
    if (scansRes.error) throw scansRes.error;
    if (measurementsRes.error) throw measurementsRes.error;
    if (outcomesRes.error) throw outcomesRes.error;

    const items: TimelineItem[] = [];

    (logsRes.data || []).forEach((l) => {
      items.push({
        type: "log",
        id: l.id,
        text: l.text,
        created_at: l.created_at,
        tag: l.entry_type,
        label: (l as any).label || null,
        referenced_by_doctor: false,
      });
    });

    (scansRes.data || []).forEach((s: any) => {
      const matchName = s.match?.match?.name;
      const matchConf = s.match?.match?.confidence;
      items.push({
        type: "scan",
        id: s.id,
        created_at: s.created_at,
        summary: matchName || "Scan recorded",
        confidence: matchConf != null ? Number(matchConf) : null,
        image_url: s.image_url,
        label: s.label || null,
        referenced_by_doctor: false,
      });
    });

    (measurementsRes.data || []).forEach((m) => {
      items.push({
        type: "measurement",
        id: m.id,
        created_at: m.created_at,
        mtype: m.type,
        value: m.value,
        unit: m.unit,
        referenced_by_doctor: false,
      });
    });

    (outcomesRes.data || []).forEach((o) => {
      items.push({
        type: "doctor",
        id: `${o.diagnosis_title}-${o.updated_at}`,
        created_at: o.updated_at || new Date().toISOString(),
        title: o.diagnosis_title,
        confidence: o.confidence,
        status: o.status,
        referenced_by_doctor: true,
      });
    });

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ items });
  } catch (err: any) {
    console.error("[timeline] error", err);
    return NextResponse.json({ error: err.message || "timeline_failed" }, { status: 500 });
  }
}

