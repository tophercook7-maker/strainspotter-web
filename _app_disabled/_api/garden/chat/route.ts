import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

type ChatMessage = {
  id: string;
  content: string;
  created_at: string;
  context?: {
    grow_id?: string | null;
    scan_id?: string | null;
    diagnosis_id?: string | null;
  };
};

function serializeContent(content: string, context?: ChatMessage["context"]) {
  return JSON.stringify({ content, context });
}

function parseContent(raw: string): { content: string; context?: ChatMessage["context"] } {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof parsed.content === "string") {
      return { content: parsed.content, context: parsed.context };
    }
  } catch (_) {
    // fall through
  }
  return { content: raw, context: undefined };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { searchParams } = new URL(req.url);
    const grow_id = searchParams.get("grow_id");
    const scan_id = searchParams.get("scan_id");
    const diagnosis_id = searchParams.get("diagnosis_id");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("grow_notes")
      .select("*")
      .eq("user_id", user.id)
      .eq("source", "chat")
      .order("created_at", { ascending: true });

    if (error) throw error;

    const filtered = (data || []).map((row: any) => {
      const parsed = parseContent(row.content);
      return {
        id: row.id,
        created_at: row.created_at,
        content: parsed.content,
        context: parsed.context,
      } as ChatMessage;
    }).filter((msg) => {
      if (grow_id && msg.context?.grow_id !== grow_id) return false;
      if (scan_id && msg.context?.scan_id !== scan_id) return false;
      if (diagnosis_id && msg.context?.diagnosis_id !== diagnosis_id) return false;
      return true;
    });

    return NextResponse.json({ messages: filtered });
  } catch (err: any) {
    console.error("[chat] GET error", err);
    return NextResponse.json({ error: err.message || "failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const body = await req.json();
    const { message, grow_id, scan_id, diagnosis_id } = body;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    const payload = {
      user_id: user.id,
      content: serializeContent(message.trim(), {
        grow_id: grow_id || null,
        scan_id: scan_id || null,
        diagnosis_id: diagnosis_id || null,
      }),
      source: "chat",
    };

    const { data, error } = await supabase.from("grow_notes").insert(payload).select().single();
    if (error) throw error;

    const parsed = parseContent(data.content);
    return NextResponse.json({
      message: {
        id: data.id,
        created_at: data.created_at,
        content: parsed.content,
        context: parsed.context,
      },
    });
  } catch (err: any) {
    console.error("[chat] POST error", err);
    return NextResponse.json({ error: err.message || "failed" }, { status: 500 });
  }
}

