// lib/scanner/plantDoctorClient.ts
//
// Client-side orchestration for the scanner's Plant Doctor mode: compress the
// grower's photos (same pipeline as strain scans, HEIC included) and call
// /api/grow-doctor/diagnose. The strain scanner spots strains from labels;
// this mode reads the LIVE PLANT — stage, age, health, problems — which a
// photo can answer far more reliably than visual strain ID.

import { compressImage } from "./scanOrchestrator";
import type { PlantAssessment } from "./plantAssessment";

export interface PlantDiagnosis {
  cause: string;
  category:
    | "nutrient" | "water" | "light" | "pest" | "disease"
    | "environment" | "mechanical" | "genetic" | "unknown";
  confidence: number;
  explanation: string;
  supportingObservations: string[];
}

export interface PlantDoctorResult {
  schemaVersion: string;
  imageAssessment: {
    isCannabisPlant: boolean;
    imageQuality: "clear" | "blurry" | "too-dark" | "too-far";
    stageObserved: string;
    affectedArea: string;
  };
  plantAssessment: PlantAssessment | null;
  diagnoses: PlantDiagnosis[];
  severity: "low" | "moderate" | "urgent";
  severityReasoning: string;
  immediateActions: string[];
  monitor: string[];
  prevention: string[];
  advisoryNote: string | null;
  notCannabisMessage: string | null;
}

export class PlantDoctorSubscriptionRequiredError extends Error {
  constructor() {
    super("Subscription required");
    this.name = "PlantDoctorSubscriptionRequiredError";
  }
}

export async function diagnosePlant(
  files: File[],
  opts: { authToken?: string; stage?: string; symptoms?: string } = {}
): Promise<PlantDoctorResult> {
  const images = await Promise.all(files.slice(0, 4).map((f) => compressImage(f)));

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.authToken) headers.Authorization = `Bearer ${opts.authToken}`;

  const res = await fetch("/api/grow-doctor/diagnose", {
    method: "POST",
    headers,
    body: JSON.stringify({
      images,
      stage: opts.stage,
      symptoms: opts.symptoms,
    }),
  });

  if (res.status === 401 || res.status === 402) {
    throw new PlantDoctorSubscriptionRequiredError();
  }
  if (!res.ok) {
    let detail = "";
    try { detail = ((await res.json()) as { error?: string }).error ?? ""; } catch { /* noop */ }
    throw new Error(detail || `Plant Doctor request failed (${res.status})`);
  }
  return (await res.json()) as PlantDoctorResult;
}
