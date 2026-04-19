// app/api/auth/create-user/route.ts
// Server-side user creation — called after Stripe checkout succeeds
// Bypasses client-side signUp() which hangs in this environment

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, membership } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existing) {
      // User exists — just update their profile with membership
      if (membership) {
        await supabase
          .from("profiles")
          .update({
            membership: membership === "pro" ? "pro" : "garden",
            display_name: name || undefined,
          })
          .eq("id", existing.id);
      }

      return NextResponse.json({
        success: true,
        userId: existing.id,
        existing: true,
      });
    }

    // Create new user via admin API (bypasses email confirmation)
    const { data: newUser, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm — they just paid
        user_metadata: { display_name: name || "" },
      });

    if (createError) {
      console.error("Create user error:", createError);
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      );
    }

    // Wait a beat for the profile trigger to fire, then update it
    await new Promise((r) => setTimeout(r, 500));

    const profileUpdates: Record<string, unknown> = {
      display_name: name || null,
    };
    if (membership) {
      profileUpdates.membership =
        membership === "pro" ? "pro" : "garden";
    }

    await supabase
      .from("profiles")
      .update(profileUpdates)
      .eq("id", newUser.user.id);

    return NextResponse.json({
      success: true,
      userId: newUser.user.id,
      existing: false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Create user route error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
