import { NextResponse } from "next/server";

type Scale = "home" | "craft" | "commercial";
type Phase = "setup" | "seedling" | "veg" | "flower" | "harvest" | "dry_cure";

type Env = {
  tempF?: number;
  humidity?: number;
  ph?: number;
  ec?: number;
  ppfd?: number;
};

type PlanRequest = {
  phase: Phase;
  scale: Scale;
  env?: Env;
  // optional context (frontend can send last logs / last scans later)
  notes?: string;
  recentSignals?: {
    // examples: "powdery_mildew_risk", "low_confidence_scan", etc.
    tags?: string[];
    lastPrimaryLabel?: string;
  };
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function vpdNote(tempF?: number, humidity?: number) {
  if (!tempF || !humidity) return null;
  // Rough guidance note (not a calculator): just sanity ranges
  if (humidity > 70)
    return "Humidity looks high. High RH increases mold risk—especially in flower/dry.";
  if (humidity < 35)
    return "Humidity looks low. Watch for stress, crispy edges, and slowed growth.";
  return null;
}

function buildPlan(req: PlanRequest) {
  const { phase, scale, env, notes, recentSignals } = req;

  const tags = new Set((recentSignals?.tags || []).map((t) => String(t).toLowerCase()));
  const lastLabel = recentSignals?.lastPrimaryLabel
    ? String(recentSignals.lastPrimaryLabel)
    : null;

  // baseline confidence: we increase if env provided and signals exist
  let confidence = 0.55;
  if (env && Object.keys(env).length >= 2) confidence += 0.1;
  if (tags.size > 0 || lastLabel) confidence += 0.07;
  if (notes && notes.trim().length > 20) confidence += 0.06;
  confidence = clamp(confidence, 0.45, 0.85);

  const actions: string[] = [];
  const watchouts: string[] = [];
  const questions: string[] = [];

  const scaleFlavor =
    scale === "commercial"
      ? "Use SOP-style checks and document everything."
      : scale === "craft"
        ? "Balance quality with repeatability."
        : "Keep it simple and consistent.";

  const vpd = vpdNote(env?.tempF, env?.humidity);
  if (vpd) watchouts.push(vpd);

  // Signal-aware nudges
  if (
    tags.has("powdery_mildew") ||
    (lastLabel && lastLabel.toLowerCase().includes("mildew"))
  ) {
    watchouts.push(
      "Possible powdery mildew signal: increase airflow, reduce RH, inspect undersides of leaves."
    );
    actions.push("Wipe/inspect hotspots and isolate affected plants if possible.");
  }
  if (
    tags.has("botrytis") ||
    (lastLabel && lastLabel.toLowerCase().includes("botrytis"))
  ) {
    watchouts.push(
      "Possible bud rot signal: remove affected material safely, lower RH, increase airflow immediately."
    );
  }

  // Phase-specific coaching
  switch (phase) {
    case "setup":
      actions.push("Confirm medium + nutrient line + target pH/EC strategy.");
      actions.push("Set environment targets per stage (temp/RH).");
      actions.push("Baseline IPM prevention routine (sticky traps, inspections).");
      questions.push("What medium are you using (soil/coco/hydro)?");
      questions.push("What grow scale: plants count / canopy size?");
      questions.push("What lights + approximate PPFD at canopy?");
      break;

    case "seedling":
      actions.push(
        "Avoid overwatering: let roots search—small, consistent waterings."
      );
      actions.push("Keep temps stable; avoid blasting seedlings with high PPFD.");
      actions.push(
        "If stretching: lower light slightly or increase intensity gradually."
      );
      watchouts.push("Watch for damping-off (overly wet + stagnant air).");
      questions.push("How old are seedlings (days since sprout)?");
      questions.push("How often are you watering and how much?");
      break;

    case "veg":
      actions.push(
        "Lock a repeatable water/feed rhythm (consistency beats chasing)."
      );
      actions.push("Train structure based on your space (LST/topping).");
      actions.push(
        "Check pH/runoff (if applicable) and watch for Mg/Ca issues."
      );
      questions.push("What week of veg and what's your feed schedule?");
      questions.push("Any leaf symptoms? Upload closeups in Scanner.");
      break;

    case "flower":
      actions.push("Reduce humidity and increase airflow to prevent mold.");
      actions.push("Canopy management: remove blockers, keep bud sites breathing.");
      actions.push("Dial bloom nutrition; avoid late heavy stress.");
      watchouts.push(
        "Inspect daily for PM/botrytis (especially dense colas)."
      );
      questions.push("What week of flower and what is your current RH?");
      questions.push("Are buds dense or airy? Any smell changes?");
      break;

    case "harvest":
      actions.push(
        "Track trichomes and decide target effect (clear/cloudy/amber)."
      );
      actions.push(
        "Keep environment stable; avoid last-minute stress swings."
      );
      actions.push(
        "Prep dry room: target slow dry, not fast crisp."
      );
      questions.push("What effect do you want (uplifting vs heavy)?");
      questions.push("Do you have a loupe/macro shots for trichomes?");
      break;

    case "dry_cure":
      actions.push(
        "Dry slow and steady: stable temp/RH, gentle airflow (not blasting)."
      );
      actions.push(
        "When curing: monitor jar RH and burp schedule consistently."
      );
      watchouts.push(
        "If you smell ammonia or feel wet spots, stop and reassess (mold risk)."
      );
      questions.push(
        "What are your dry room temp/RH and how many days hanging?"
      );
      questions.push("Are stems snapping or still bending?");
      break;
  }

  // Scale adjustments: add more structure for bigger grows
  if (scale === "commercial") {
    actions.unshift(
      "Run a daily checklist: environment, irrigation, scouting, notes."
    );
    actions.push("Log deviations + corrective actions for traceability.");
    watchouts.push(
      "Confirm sanitation SOPs and cross-room contamination controls."
    );
  } else if (scale === "craft") {
    actions.unshift(
      "Do a focused daily scout: canopy tops + leaf undersides + random sampling."
    );
    actions.push(
      "Track 2–3 KPIs per week (RH, irrigation rhythm, leaf symptoms)."
    );
  } else {
    actions.unshift(
      "Do one quick daily check: temp/RH + leaf posture + soil moisture."
    );
  }

  const headlineMap: Record<Phase, string> = {
    setup: "Today: plan the run and lock your targets",
    seedling: "Today: protect seedlings and build roots",
    veg: "Today: build structure and stabilize growth",
    flower: "Today: prevent mold and bulk safely",
    harvest: "Today: confirm harvest window and prep dry",
    dry_cure: "Today: preserve terps and avoid mold",
  };

  return {
    phase,
    scale,
    headline: headlineMap[phase],
    flavor: scaleFlavor,
    actions,
    watchouts,
    questions,
    confidence,
  };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as PlanRequest | null;

  if (!body?.phase || !body?.scale) {
    return NextResponse.json(
      { error: "Missing required fields: phase, scale" },
      { status: 400 }
    );
  }

  const plan = buildPlan(body);
  return NextResponse.json(plan);
}
