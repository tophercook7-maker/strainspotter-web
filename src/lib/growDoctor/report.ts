import { getSupabaseServerClient } from "@/lib/supabaseServer";

export type DiagnosticResult = {
  title: string;
  confidence: "Low" | "Moderate" | "High";
  evidence: string[];
  actions: string[];
};

type Measurement = {
  id: string;
  created_at: string;
  type: string | null;
  value: number | null;
  unit: string | null;
};

type Scan = {
  id: string;
  created_at: string;
  model_output: Record<string, any> | null;
  image_url?: string | null;
};

type Log = {
  id: string;
  created_at: string;
  type: string | null;
  content: string | null;
};

type BaselineStats = {
  avg: number;
  min: number;
  max: number;
};

export async function getGrowDoctorReport(growId: string): Promise<{
  diagnoses: DiagnosticResult[];
  lastCheckedAt: string | null;
}> {
  const supabase = getSupabaseServerClient();

  // Fetch grow to ensure it exists (non-blocking result)
  const growResult = await supabase.from("grows").select("id, created_at").eq("id", growId).maybeSingle();
  if (growResult.error) {
    console.error("[GrowDoctor] failed to load grow", growResult.error);
  }

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [scansRes, logsRes, measurementsRes] = await Promise.all([
    supabase
      .from("scans")
      .select("id, created_at, model_output, image_url")
      .eq("grow_id", growId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("logs")
      .select("id, created_at, type, content")
      .eq("grow_id", growId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("measurements")
      .select("id, created_at, type, value, unit")
      .eq("grow_id", growId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (scansRes.error) console.error("[GrowDoctor] scans error", scansRes.error);
  if (logsRes.error) console.error("[GrowDoctor] logs error", logsRes.error);
  if (measurementsRes.error) console.error("[GrowDoctor] measurements error", measurementsRes.error);

  const scans: Scan[] = scansRes.data ?? [];
  const logs: Log[] = logsRes.data ?? [];
  const measurements: Measurement[] = measurementsRes.data ?? [];

  const lastCheckedAt = getLatestTimestamp([
    ...(scans?.map((s) => s.created_at) ?? []),
    ...(logs?.map((l) => l.created_at) ?? []),
    ...(measurements?.map((m) => m.created_at) ?? []),
  ]);

  const baselines = computeBaselines(measurements);
  const diagnoses = runRuleEngine({ scans, logs, measurements, baselines });

  return {
    diagnoses,
    lastCheckedAt,
  };
}

function getLatestTimestamp(dates: string[]): string | null {
  if (!dates.length) return null;
  return dates.reduce((latest, ts) => (latest > ts ? latest : ts), dates[0]);
}

function computeBaselines(measurements: Measurement[]): Record<string, BaselineStats> {
  const grouped: Record<string, number[]> = {};
  measurements.forEach((m) => {
    if (!m.type || m.value == null) return;
    const key = m.type.toLowerCase();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m.value);
  });

  const stats: Record<string, BaselineStats> = {};
  Object.entries(grouped).forEach(([type, values]) => {
    if (!values.length) return;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    stats[type] = { avg, min, max };
  });
  return stats;
}

function runRuleEngine({
  scans,
  logs,
  measurements,
  baselines,
}: {
  scans: Scan[];
  logs: Log[];
  measurements: Measurement[];
  baselines: Record<string, BaselineStats>;
}): DiagnosticResult[] {
  const results: DiagnosticResult[] = [];

  const latestByType: Record<string, Measurement> = {};
  measurements.forEach((m) => {
    if (!m.type || m.value == null) return;
    const key = m.type.toLowerCase();
    if (!latestByType[key]) {
      latestByType[key] = m;
    }
  });

  const addDiagnosis = (title: string, confidence: DiagnosticResult["confidence"], evidence: string[], actions: string[]) => {
    results.push({ title, confidence, evidence, actions });
  };

  // Rule: nitrogen deficiency hint
  const nitrogen = latestByType["nitrogen"];
  const nitrogenStats = baselines["nitrogen"];
  if (nitrogen && nitrogenStats) {
    const below = nitrogen.value! < nitrogenStats.avg * 0.85;
    if (below) {
      addDiagnosis(
        "Likely nitrogen deficiency",
        "Moderate",
        [
          "Nitrogen levels below your typical range",
          "Recent measurement deviates from baseline",
          ...scanHints(scans),
        ],
        ["Increase nitrogen slightly at next feeding", "Monitor leaf color over the next 48 hours", "Re-scan after adjustment"]
      );
    }
  }

  // Rule: phosphorus deficiency hint
  const phosphorus = latestByType["phosphorus"] || latestByType["p"];
  const phosphorusStats = baselines["phosphorus"] || baselines["p"];
  if (phosphorus && phosphorusStats) {
    const below = phosphorus.value! < phosphorusStats.avg * 0.85;
    if (below) {
      addDiagnosis(
        "Possible phosphorus deficiency",
        "Moderate",
        [
          "Phosphorus below your typical range",
          "Recent value is notably under baseline",
          ...scanHints(scans),
        ],
        ["Increase phosphorus slightly in next feed", "Check root zone pH to keep in uptake range", "Re-scan after adjustment"]
      );
    }
  }

  // Rule: potassium deficiency hint
  const potassium = latestByType["potassium"] || latestByType["k"];
  const potassiumStats = baselines["potassium"] || baselines["k"];
  if (potassium && potassiumStats) {
    const below = potassium.value! < potassiumStats.avg * 0.85;
    if (below) {
      addDiagnosis(
        "Possible potassium deficiency",
        "Moderate",
        [
          "Potassium levels below your typical range",
          "Edge stress often links to low K",
          ...scanHints(scans),
        ],
        ["Slightly raise potassium in next feeding", "Watch leaf edges for burn or curl", "Re-scan after feeding"]
      );
    }
  }

  // Rule: micronutrient imbalance (general spread)
  const microKeys = ["calcium", "magnesium", "iron", "manganese", "zinc"];
  const microStats = microKeys
    .map((k) => ({ key: k, stat: baselines[k], latest: latestByType[k] }))
    .filter((m) => m.stat && m.latest && m.latest.value != null);
  if (microStats.length >= 2) {
    const values = microStats.map((m) => m.latest!.value!);
    const spread = Math.max(...values) - Math.min(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    if (avg > 0 && spread / avg > 0.35) {
      addDiagnosis(
        "Micronutrient balance needs attention",
        "Low",
        [
          "Micro readings vary more than usual",
          "Imbalances can limit uptake even at normal macros",
          "Consider a balanced micro supplement",
        ],
        ["Use a balanced micro feed for next watering", "Hold macros steady while balancing micros", "Re-check pH to keep micros available"]
      );
    }
  }

  // Rule: heat stress hint
  const temp = latestByType["temp"] || latestByType["temperature"];
  if (temp && temp.value && temp.value > 30) {
    addDiagnosis(
      "Early heat stress detected",
      temp.value > 32 ? "High" : "Moderate",
      [
        "Canopy temperature trending above your baseline",
        "Slight leaf curl noted in recent log",
        "VPD higher than your usual range",
      ],
      ["Increase airflow or reduce light intensity slightly", "Monitor leaf curl over the next 48 hours", "Re-scan after adjustments"]
    );
  }

  // Rule: light stress
  const lightStressLogs = keywordHits(logs, ["bleach", "light burn", "too bright"]);
  if ((temp && temp.value > 30) || lightStressLogs > 0) {
    addDiagnosis(
      "Light stress pattern noted",
      temp && temp.value > 32 ? "High" : lightStressLogs > 0 ? "Moderate" : "Low",
      [
        "Symptoms align with elevated light or heat load",
        lightStressLogs > 0 ? "Recent notes mention light stress cues" : "Consider checking canopy distance",
      ],
      ["Lower light intensity or raise fixtures slightly", "Monitor new growth for recovery over 48 hours", "Re-scan after adjustments"]
    );
  }

  // Rule: airflow deficiency
  const humidity = latestByType["humidity"];
  const humidityHigh = humidity?.value && humidity.value > 72;
  const airflowLogs = keywordHits(logs, ["stagnant", "airflow", "mildew", "powdery"]);
  if (humidityHigh || airflowLogs > 0) {
    addDiagnosis(
      "Airflow may be insufficient",
      humidityHigh && airflowLogs > 0 ? "Moderate" : "Low",
      [
        humidityHigh ? `Humidity elevated (${humidity?.value}%)` : "Recent notes mention airflow concerns",
        airflowLogs > 0 ? "Logs reference airflow or mildew risk" : "Consider improving circulation",
      ],
      ["Increase circulation near canopy", "Avoid overwatering to reduce humidity spikes", "Monitor leaf surfaces and re-scan after changes"]
    );
  }

  // Rule: root oxygen deprivation
  const overwaterLogs = keywordHits(logs, ["overwater", "soggy", "waterlogged"]);
  if (overwaterLogs >= 1) {
    addDiagnosis(
      "Root zone may be oxygen-limited",
      overwaterLogs >= 2 ? "Moderate" : "Low",
      [
        "Notes mention overwatering or soggy media",
        "Low oxygen can slow uptake even when feed is adequate",
      ],
      ["Allow media to dry back slightly before next watering", "Increase aeration or drainage in the medium", "Monitor turgor and re-scan"]
    );
  }

  // Rule: salt buildup (high EC)
  const ec = latestByType["ec"];
  const ecStats = baselines["ec"];
  if (ec && ec.value && ecStats && ec.value > ecStats.avg * 1.2) {
    addDiagnosis(
      "Salt buildup pattern observed",
      ec.value > ecStats.avg * 1.35 ? "Moderate" : "Low",
      [
        `EC above your recent baseline (${ec.value})`,
        "High EC can reduce uptake efficiency",
      ],
      ["Consider a light flush to reset EC", "Resume balanced feed at modest strength", "Re-check runoff EC and re-scan"]
    );
  }

  // Rule: stress accumulation (multiple mild signals)
  const mildSignals = results.length;
  if (mildSignals >= 3) {
    addDiagnosis(
      "Mild stress signals accumulating",
      "Low",
      [
        "Several mild conditions detected simultaneously",
        "Stacked stress can slow growth over time",
      ],
      ["Simplify inputs for the next few days", "Monitor new growth for recovery", "Re-scan after changes"]
    );
  }

  // Rule: pH imbalance
  const ph = latestByType["ph"];
  if (ph && ph.value && (ph.value < 5.8 || ph.value > 6.8)) {
    addDiagnosis(
      "pH imbalance affecting nutrient uptake",
      "Moderate",
      [
        `Recent pH reading at ${ph.value}`,
        "Outside typical 5.8–6.8 range for uptake",
        "Consider matching feed pH to target range",
      ],
      ["Adjust pH toward 5.8–6.5", "Re-check runoff pH at next feeding", "Re-scan after pH is stabilized"]
    );
  }

  // Rule: repeated issue logs
  const issueLogs = logs.filter((l) => (l.type ?? "").toLowerCase().includes("issue") || (l.content ?? "").toLowerCase().includes("deficiency"));
  if (issueLogs.length >= 3) {
    addDiagnosis(
      "Repeated issues noted in recent logs",
      "Low",
      [
        `Multiple issue-tagged logs in the last 14 days (${issueLogs.length})`,
        "Consider addressing recurring themes from notes",
      ],
      ["Review recent issues and apply targeted fixes", "Log resolution steps to track improvement", "Re-scan after adjustments"]
    );
  }

  return results;
}

function scanHints(scans: Scan[]): string[] {
  if (!scans.length) return [];
  const recent = scans.slice(0, 2);
  return recent.map((s) => `Scan pattern noted (${s.created_at.slice(0, 10)})`);
}

function keywordHits(logs: Log[], keywords: string[]): number {
  return logs.reduce((count, log) => {
    const text = `${log.type ?? ""} ${log.content ?? ""}`.toLowerCase();
    return keywords.some((k) => text.includes(k.toLowerCase())) ? count + 1 : count;
  }, 0);
}

