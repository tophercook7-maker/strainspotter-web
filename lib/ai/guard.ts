/**
 * AI guardrail helpers for controlled invocation and calm tone.
 */

type AIContext =
  | { kind: "interpretation" }
  | { kind: "grow-doctor" }
  | { kind: "post-scan-summary"; confidence?: number | string }
  | { kind: "chat"; userAsked?: boolean };

export function allowAI(ctx: AIContext): boolean {
  if (ctx.kind === "interpretation" || ctx.kind === "grow-doctor") return true;
  if (ctx.kind === "post-scan-summary") {
    const c = typeof ctx.confidence === "string" ? parseFloat(ctx.confidence) : ctx.confidence ?? 0;
    return c >= 50; // Moderate/High only
  }
  if (ctx.kind === "chat") return Boolean(ctx.userAsked);
  return false;
}

const URGENCY_PATTERNS = [
  /you should/gi,
  /you must/gi,
  /urgent/gi,
  /immediately/gi,
  /warning/gi,
  /guarantee/gi,
];

export function enforceCalmTone(text: string): string {
  let output = text || "";
  URGENCY_PATTERNS.forEach((p) => {
    output = output.replace(p, "");
  });
  return output.trim();
}

