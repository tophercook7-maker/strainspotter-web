// app/api/strain-submissions/route.ts
//
// Trust-layered crowdsourcing endpoint. POST a candidate strain
// submission with photo evidence; the server enforces:
//
//   1. Subscription gate (paid users only — closes zero-cost spam vector)
//   2. Photo evidence required (evidence_image_url)
//   3. OCR text must be a near-match to the proposed name (closes
//      'point at random plant and call it whatever' attack)
//   4. trust_weight is derived server-side from the user's role
//      (anon paid 1.0, claimed grower 1.5, claimed dispensary owner 2.0)
//   5. UNIQUE (submitter_id, normalized_name) on the table prevents
//      one user padding their own threshold
//
// Layers 6-8 (community reports, admin promotion, threshold check)
// run in separate code paths.

import { NextRequest, NextResponse } from "next/server";
import { requireSubscription } from "@/lib/auth/serverGate";
import { logger } from "@/lib/observability/log";
import { checkRateLimit } from "@/lib/observability/rateLimit";

export const runtime = "nodejs"; // Supabase admin needs Node, not Edge.

interface SubmitBody {
  proposedName: string;
  evidenceImageUrl: string;
  ocrText?: string;
  proposedType?: "Sativa" | "Indica" | "Hybrid" | "unknown";
  proposedLineage?: string;
  proposedNotes?: string;
  sourceDispensaryId?: string;
  sourceSeedVendor?: string;
}

/** Lowercase, strip punctuation/whitespace runs to a canonical form. */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns true if `ocrText` plausibly contains the proposed strain name.
 * Tolerant: matches on normalized substring, allows minor OCR noise.
 */
function ocrMatches(ocrText: string, proposedName: string): boolean {
  const ocrNorm = normalize(ocrText);
  const nameNorm = normalize(proposedName);
  if (!ocrNorm || !nameNorm) return false;
  // Exact substring after normalization
  if (ocrNorm.includes(nameNorm)) return true;
  // Token-level — every word of the proposed name appears somewhere in OCR
  const tokens = nameNorm.split(" ").filter((t) => t.length >= 3);
  if (tokens.length === 0) return false;
  return tokens.every((t) => ocrNorm.includes(t));
}

/** Map the user's role to trust_weight per the schema comment. */
async function deriveTrustWeight(
  userId: string,
  log: ReturnType<typeof logger.child>,
  reqId: string
): Promise<number> {
  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase/server");
    const supabase = getSupabaseAdmin();

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("user_role")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) {
      log.warn("submission_role_lookup_error", {
        req: reqId,
        message: profErr.message,
      });
      return 1.0;
    }

    const role = profile?.user_role;
    if (role === "dispensary_owner") return 2.0;
    if (role === "grower") return 1.5;
    return 1.0;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.warn("submission_role_lookup_threw", { req: reqId, message });
    return 1.0;
  }
}

/**
 * After a successful insert, check whether this submission's
 * normalized_name has crossed the threshold (3.0 cumulative weight from
 * DISTINCT submitters). If so, promote all matching submissions to
 * 'reviewing' so an admin can take a look.
 */
async function maybePromoteToReviewing(
  normalizedName: string,
  log: ReturnType<typeof logger.child>,
  reqId: string
): Promise<{ promoted: boolean; cumulativeWeight: number }> {
  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase/server");
    const supabase = getSupabaseAdmin();

    // Sum trust_weight grouped by submitter_id (count each submitter once
    // per name; the UNIQUE index on the table guarantees this row-wise).
    const { data, error } = await supabase
      .from("strain_submissions")
      .select("trust_weight")
      .eq("normalized_name", normalizedName)
      .eq("status", "pending")
      .eq("ocr_matched", true);

    if (error) {
      log.warn("submission_threshold_query_error", {
        req: reqId,
        message: error.message,
      });
      return { promoted: false, cumulativeWeight: 0 };
    }

    const total = (data || []).reduce(
      (sum, row) => sum + Number(row.trust_weight || 0),
      0
    );

    if (total >= 3.0) {
      // Promote every matching pending submission for this name to
      // 'reviewing' so the admin sees the whole evidence set at once.
      const { error: updErr } = await supabase
        .from("strain_submissions")
        .update({ status: "reviewing" })
        .eq("normalized_name", normalizedName)
        .eq("status", "pending");
      if (updErr) {
        log.warn("submission_threshold_promote_error", {
          req: reqId,
          message: updErr.message,
        });
        return { promoted: false, cumulativeWeight: total };
      }
      log.info("submission_promoted_to_reviewing", {
        req: reqId,
        normalizedName,
        cumulativeWeight: total,
      });
      return { promoted: true, cumulativeWeight: total };
    }

    return { promoted: false, cumulativeWeight: total };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.warn("submission_threshold_threw", { req: reqId, message });
    return { promoted: false, cumulativeWeight: 0 };
  }
}

export async function POST(req: NextRequest) {
  const log = logger.child({ route: "/api/strain-submissions" });
  const reqId = log.requestId();
  const t0 = Date.now();

  // Layer 1 — subscription gate.
  const gate = await requireSubscription(req);
  if (gate.ok === false) {
    log.warn("submission_gate_blocked", { req: reqId });
    return gate.response;
  }

  // Rate limit — 5 submissions per minute per user (well above legitimate
  // need; below abuse threshold).
  const rl = checkRateLimit(`strain-sub:${gate.userId}`, 5, 60);
  if (rl.ok === false) {
    log.warn("submission_rate_limited", {
      req: reqId,
      user: gate.userId,
      retryAfter: rl.retryAfterSec,
    });
    return NextResponse.json(
      {
        error: "Slow down a moment, then try again.",
        code: "rate_limited",
      },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }

  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  // Layer 2 — required fields, including photo evidence.
  const proposedName = (body.proposedName || "").trim();
  const evidenceImageUrl = (body.evidenceImageUrl || "").trim();
  if (proposedName.length < 2 || proposedName.length > 80) {
    return NextResponse.json(
      { error: "Strain name must be 2-80 characters." },
      { status: 400 }
    );
  }
  if (!evidenceImageUrl || !/^https?:\/\//.test(evidenceImageUrl)) {
    return NextResponse.json(
      { error: "Photo evidence (evidenceImageUrl) is required." },
      { status: 400 }
    );
  }

  const normalizedName = normalize(proposedName);
  if (normalizedName.length < 2) {
    return NextResponse.json(
      { error: "Proposed name normalizes to nothing." },
      { status: 400 }
    );
  }

  // Layer 3 — OCR must contain a near-match.
  const ocrText = (body.ocrText || "").trim();
  const ocrMatched = ocrText.length > 0 && ocrMatches(ocrText, proposedName);
  if (!ocrMatched) {
    log.warn("submission_ocr_no_match", {
      req: reqId,
      user: gate.userId,
      proposedName,
      ocrLen: ocrText.length,
    });
    return NextResponse.json(
      {
        error:
          "We couldn't find the strain name in the photo's label. Submit a clearer photo of the dispensary jar / seed packet / lab sheet.",
        code: "ocr_no_match",
      },
      { status: 422 }
    );
  }

  // Layer 4 — trust weight from server-derived role (never client-trusted).
  const trustWeight = await deriveTrustWeight(gate.userId, log, reqId);

  // Insert.
  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase/server");
    const supabase = getSupabaseAdmin();

    const { data: inserted, error: insErr } = await supabase
      .from("strain_submissions")
      .insert({
        submitter_id: gate.userId,
        proposed_name: proposedName,
        normalized_name: normalizedName,
        evidence_image_url: evidenceImageUrl,
        ocr_text: ocrText,
        ocr_matched: ocrMatched,
        proposed_type: body.proposedType ?? "unknown",
        proposed_lineage: body.proposedLineage ?? null,
        proposed_notes: body.proposedNotes ?? null,
        source_dispensary_id: body.sourceDispensaryId ?? null,
        source_seed_vendor: body.sourceSeedVendor ?? null,
        trust_weight: trustWeight,
      })
      .select("id")
      .single();

    if (insErr) {
      // Layer 5 — UNIQUE (submitter_id, normalized_name): if duplicate,
      // tell the user gently. Postgres error code 23505.
      if (
        /duplicate key/i.test(insErr.message) ||
        (insErr as any)?.code === "23505"
      ) {
        log.info("submission_duplicate_for_user", {
          req: reqId,
          user: gate.userId,
          normalizedName,
        });
        return NextResponse.json(
          {
            error:
              "You've already submitted this strain. Each user counts once per strain.",
            code: "duplicate",
          },
          { status: 409 }
        );
      }
      log.error("submission_insert_failed", {
        req: reqId,
        message: insErr.message,
      });
      return NextResponse.json(
        { error: "Couldn't save your submission. Please try again." },
        { status: 500 }
      );
    }

    // Layer 6 — threshold check.
    const { promoted, cumulativeWeight } = await maybePromoteToReviewing(
      normalizedName,
      log,
      reqId
    );

    log.info("submission_accepted", {
      req: reqId,
      user: gate.userId,
      submissionId: inserted.id,
      normalizedName,
      trustWeight,
      cumulativeWeight,
      promoted,
      ms: Date.now() - t0,
    });

    return NextResponse.json({
      ok: true,
      submissionId: inserted.id,
      status: promoted ? "reviewing" : "pending",
      cumulativeWeight,
      thresholdToReview: 3.0,
      message: promoted
        ? "Thanks. Your submission, plus others matching the same strain, is now under review by our team."
        : "Thanks. Your submission is recorded. Once 3 different verified subscribers submit matching evidence, the strain enters review.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.error("submission_handler_error", {
      req: reqId,
      message,
      ms: Date.now() - t0,
    });
    return NextResponse.json(
      { error: "Submission failed.", detail: message },
      { status: 500 }
    );
  }
}

/** GET — return the user's own submissions. */
export async function GET(req: NextRequest) {
  const log = logger.child({ route: "/api/strain-submissions" });
  const reqId = log.requestId();

  const gate = await requireSubscription(req);
  if (gate.ok === false) return gate.response;

  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase/server");
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("strain_submissions")
      .select(
        "id, proposed_name, normalized_name, status, trust_weight, ocr_matched, created_at, evidence_image_url"
      )
      .eq("submitter_id", gate.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      log.error("submission_list_failed", {
        req: reqId,
        message: error.message,
      });
      return NextResponse.json(
        { error: "Couldn't load your submissions." },
        { status: 500 }
      );
    }

    return NextResponse.json({ submissions: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.error("submission_list_handler_error", { req: reqId, message });
    return NextResponse.json(
      { error: "Couldn't load your submissions." },
      { status: 500 }
    );
  }
}
