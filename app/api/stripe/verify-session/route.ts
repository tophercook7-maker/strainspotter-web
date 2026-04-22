import { NextRequest, NextResponse } from "next/server";
import { findAuthUserByEmail } from "@/lib/supabase/findAuthUserByEmail";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  buildMembershipStripeUpdate,
  incrementTopupScans,
} from "@/lib/stripe/membershipProfileSync";
import { getStripe } from "@/lib/stripe/server";

function membershipFromPriceKey(
  priceKey: string | undefined
): "garden" | "pro" | null {
  if (priceKey === "member") return "garden";
  if (priceKey === "pro") return "pro";
  return null;
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    const priceKey = session.metadata?.priceKey;
    const metadataUserId = session.metadata?.userId?.trim();
    const userId =
      metadataUserId && metadataUserId.length > 0 ? metadataUserId : null;
    const email =
      session.customer_details?.email || session.customer_email || null;
    const name =
      session.metadata?.customerName ||
      session.customer_details?.name ||
      null;
    const customerId =
      typeof session.customer === "string" ? session.customer : null;

    const membership = membershipFromPriceKey(priceKey);
    const tier =
      priceKey === "pro" ? "pro" : priceKey === "member" ? "member" : null;

    const supabase = getSupabaseAdmin();

    if (membership) {
      if (userId) {
        const updates = await buildMembershipStripeUpdate(
          supabase,
          userId,
          membership,
          customerId
        );
        const { data, error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", userId)
          .select("id");

        if (error) {
          console.error(
            "[verify-session] profile update failed (userId path):",
            error.message
          );
        } else if (!data?.length) {
          console.warn(
            "[verify-session] profile sync: no profile row matched userId; consider email fallback if applicable"
          );
        } else {
          console.log(
            "[verify-session] profile sync: used userId metadata path",
            { sessionId }
          );
        }
      } else {
        console.log(
          "[verify-session] profile sync: userId missing in metadata, using email lookup fallback"
        );
        if (!email) {
          console.warn(
            "[verify-session] profile sync: email fallback unavailable (no customer email on session)"
          );
        } else {
          try {
            const { data: userList } = await supabase.auth.admin.listUsers();
            const user = findAuthUserByEmail(userList, email);

            if (!user) {
              console.warn(
                "[verify-session] profile sync: no auth user matched email (listUsers lookup)"
              );
            } else {
              const merged = await buildMembershipStripeUpdate(
                supabase,
                user.id,
                membership,
                customerId
              );
              const { error } = await supabase
                .from("profiles")
                .update(merged)
                .eq("id", user.id);

              if (error) {
                console.error(
                  "[verify-session] profile update failed (email path):",
                  error.message
                );
              } else {
                console.log(
                  "[verify-session] profile sync: used email fallback path",
                  { sessionId }
                );
              }
            }
          } catch (e) {
            console.error("[verify-session] profile sync (email path) error:", e);
          }
        }
      }
    } else if (priceKey === "topup_10" || priceKey === "topup_25") {
      const amount = priceKey === "topup_10" ? 10 : 25;
      if (userId) {
        const r = await incrementTopupScans(
          supabase,
          userId,
          amount,
          customerId
        );
        if (!r.ok) {
          console.error("[verify-session] topup sync failed (userId):", r.error);
        } else {
          console.log("[verify-session] topup added via userId", { amount });
        }
      } else if (email) {
        const { data: userList } = await supabase.auth.admin.listUsers();
        const user = findAuthUserByEmail(userList, email);
        if (!user) {
          console.warn("[verify-session] topup: no user for email");
        } else {
          const r = await incrementTopupScans(
            supabase,
            user.id,
            amount,
            customerId
          );
          if (!r.ok) {
            console.error("[verify-session] topup sync failed (email):", r.error);
          } else {
            console.log("[verify-session] topup added via email", { amount });
          }
        }
      } else {
        console.warn("[verify-session] topup: no userId or email on session");
      }
    } else {
      if (priceKey) {
        console.warn(
          "[verify-session] not synced: priceKey does not map to membership or topup:",
          priceKey
        );
      } else {
        console.warn(
          "[verify-session] not synced: missing priceKey in session metadata"
        );
      }
    }

    return NextResponse.json({ tier, email, name });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Verify session error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
