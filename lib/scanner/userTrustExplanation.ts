export interface EvidenceItem {
  source: string;
  strength: "strong" | "moderate" | "weak";
  contribution: string;
}

export interface TrustExplanation {
  primaryTrustMessage: string;
  evidenceChain: EvidenceItem[];
  uncertaintyAcknowledgment: {
    hasUncertainty: boolean;
    reasons: string[];
  };
}

export function generateTrustExplanation(
  finalDecision: any,
  primaryCandidate: any,
  _vectors: { inferredTerpeneVector: any; inferredEffectVector: any },
  _extra: unknown,
  imageCount: number
): TrustExplanation {
  const confidence: number = finalDecision?.confidence ?? primaryCandidate?.confidence ?? 50;
  const strainName: string = finalDecision?.name ?? primaryCandidate?.name ?? "this strain";

  const evidenceChain: EvidenceItem[] = [];

  if (confidence >= 75) {
    evidenceChain.push({
      source: "Visual analysis",
      strength: "strong",
      contribution: `Bud structure, colour, and trichome density closely match ${strainName}.`,
    });
  } else {
    evidenceChain.push({
      source: "Visual analysis",
      strength: "moderate",
      contribution: `Some visual characteristics are consistent with ${strainName}, though not all traits are definitive.`,
    });
  }

  if (imageCount > 1) {
    evidenceChain.push({
      source: "Multi-photo agreement",
      strength: confidence >= 70 ? "strong" : "moderate",
      contribution:
        confidence >= 70
          ? "Multiple photos consistently point to the same strain."
          : "Photos provide partial agreement across angles.",
    });
  } else {
    evidenceChain.push({
      source: "Single image",
      strength: "weak",
      contribution: "Only one photo was provided. Additional angles would strengthen the result.",
    });
  }

  if (primaryCandidate?.reason) {
    evidenceChain.push({
      source: "Database match",
      strength: confidence >= 80 ? "strong" : "moderate",
      contribution: primaryCandidate.reason,
    });
  }

  const uncertaintyReasons: string[] = [];
  if (imageCount === 1) {
    uncertaintyReasons.push("Only one photo was analysed — more angles improve accuracy.");
  }
  if (confidence < 65) {
    uncertaintyReasons.push("Visual traits are ambiguous or shared with similar strains.");
  }
  if (confidence < 75 && !primaryCandidate?.reason) {
    uncertaintyReasons.push("No strong database signal was found for this sample.");
  }

  const primaryTrustMessage =
    confidence >= 85
      ? `We are highly confident this is ${strainName}. Visual markers and database records align closely.`
      : confidence >= 70
      ? `This is likely ${strainName} based on visual and structural analysis. Confidence is good but not definitive.`
      : confidence >= 55
      ? `${strainName} is the best match from available data, though the visual evidence is moderate.`
      : `We identified ${strainName} as the closest match, but confidence is limited. Clearer photos may help.`;

  return {
    primaryTrustMessage,
    evidenceChain,
    uncertaintyAcknowledgment: {
      hasUncertainty: uncertaintyReasons.length > 0,
      reasons: uncertaintyReasons,
    },
  };
}
