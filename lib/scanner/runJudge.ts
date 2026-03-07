// STEP J7 — Call Judgment Engine from scanner

export type JudgeCandidate = {
  strain_id: string;
  strain_name: string;
  storage_path: string | null;
  similarity: number;
};

export type JudgeResponse = {
  ok: boolean;
  error?: string;
  description?: string;
  best?: JudgeCandidate | null;
  candidates?: JudgeCandidate[];
  askForBetterPics?: boolean;
  guidance?: string;
  reason?: string;
  cultivar_name?: string | null;
  confidence?: number;
  noRealMatch?: boolean;
  userMessage?: string | null;
  observations?: string[];
  reasoning?: string;
};

export async function runJudge(imageDataUrl: string): Promise<JudgeResponse> {
  const res = await fetch("/api/scan/judge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageDataUrl,
      topK: 5,
      minSimilarity: 0.0,
      anonSessionId: typeof localStorage !== "undefined" ? localStorage.getItem("anon_session_id") ?? undefined : undefined,
    }),
  });

  if (!res.ok) {
    throw new Error("Judge failed");
  }

  return res.json();
}
