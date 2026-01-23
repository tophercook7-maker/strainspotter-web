// Phase 5.3 — Confidence Tuning & Expectation Setting
// lib/scanner/confidenceExpectations.ts

/**
 * Phase 5.3 — Confidence Expectation Guide
 * 
 * Defines what confidence levels mean and what evidence is required.
 * Goal: Make 85% feel meaningful, not fake.
 */

export type ConfidenceTier = "very_high" | "high" | "medium" | "low";

export type ConfidenceExpectation = {
  tier: ConfidenceTier;
  minPercent: number;
  maxPercent: number;
  label: string;
  description: string;
  requiredEvidence: string[];
  typicalScenario: string;
};

/**
 * Phase 5.3.1 — Confidence Expectation Guide
 * 
 * Defines realistic expectations for each confidence tier.
 */
export const CONFIDENCE_EXPECTATIONS: ConfidenceExpectation[] = [
  {
    tier: "very_high",
    minPercent: 93,
    maxPercent: 99,
    label: "Very High Confidence",
    description: "Multiple strong signals align with high certainty",
    requiredEvidence: [
      "3+ diverse images with strong agreement",
      "Strong database match (exact or close variant)",
      "Clear visual + genetic alignment",
      "Minimal contradictions",
      "High fingerprint separation (clear winner)"
    ],
    typicalScenario: "Multiple angles show consistent traits, database confirms exact match, visual features align strongly"
  },
  {
    tier: "high",
    minPercent: 85,
    maxPercent: 92,
    label: "High Confidence",
    description: "Strong evidence from multiple sources",
    requiredEvidence: [
      "2+ images with good agreement OR 1 high-quality image with strong DB match",
      "Good database match (exact, alias, or close variant)",
      "Visual or genetic alignment present",
      "Low contradiction score"
    ],
    typicalScenario: "Two diverse angles agree, database match is strong, visual traits align well"
  },
  {
    tier: "medium",
    minPercent: 70,
    maxPercent: 84,
    label: "Moderate Confidence",
    description: "Reasonable evidence with some uncertainty",
    requiredEvidence: [
      "1-2 images with moderate agreement",
      "Moderate database match OR family-level match",
      "Some visual/genetic alignment OR some contradictions"
    ],
    typicalScenario: "Single image with good DB match, or multiple images with some variation, or family-level identification"
  },
  {
    tier: "low",
    minPercent: 50,
    maxPercent: 69,
    label: "Low Confidence",
    description: "Limited evidence, best available match",
    requiredEvidence: [
      "1 image OR multiple similar images",
      "Weak database match OR fallback name",
      "Limited alignment OR significant contradictions"
    ],
    typicalScenario: "Single image with weak match, or conflicting signals, or fallback to closest known cultivar"
  }
];

/**
 * Phase 5.3.2 — Get Confidence Expectation
 * 
 * Returns the expectation guide for a given confidence level.
 */
export function getConfidenceExpectation(confidence: number): ConfidenceExpectation {
  const expectation = CONFIDENCE_EXPECTATIONS.find(
    exp => confidence >= exp.minPercent && confidence <= exp.maxPercent
  );
  
  // Fallback to medium if not found
  return expectation || CONFIDENCE_EXPECTATIONS[2];
}

/**
 * Phase 5.3.3 — Check Evidence Thresholds for 85%+
 * 
 * Verifies that strong evidence exists before allowing 85%+ confidence.
 * Returns true if evidence is sufficient, false otherwise.
 */
export function checkEvidenceThresholdsForHighConfidence(args: {
  fingerprintScore: number; // 0-1
  fingerprintSeparation: number; // 0-1, gap to #2
  crossImageAgreement: number; // 0-1
  visualAlignment: number; // 0-1
  geneticAlignment: number; // 0-1
  contradictionScore: number; // 0-1, lower is better
  imageCount: number;
  hasStrongDatabaseMatch: boolean; // Exact or close variant match
}): {
  meetsThreshold: boolean;
  missingRequirements: string[];
} {
  const {
    fingerprintScore,
    fingerprintSeparation,
    crossImageAgreement,
    visualAlignment,
    geneticAlignment,
    contradictionScore,
    imageCount,
    hasStrongDatabaseMatch,
  } = args;
  
  const missingRequirements: string[] = [];
  
  // Phase 5.3.3 — Evidence thresholds for 85%+ confidence
  // At least 3 of these must be true:
  const evidenceChecks: Array<{ check: boolean; requirement: string }> = [
    {
      check: hasStrongDatabaseMatch,
      requirement: "Strong database match (exact or close variant)"
    },
    {
      check: imageCount >= 2 && crossImageAgreement >= 0.75,
      requirement: "2+ images with ≥75% agreement"
    },
    {
      check: fingerprintScore >= 0.8,
      requirement: "Fingerprint score ≥80%"
    },
    {
      check: fingerprintSeparation >= 0.1,
      requirement: "Clear winner (≥10% gap to #2)"
    },
    {
      check: (visualAlignment + geneticAlignment) / 2 >= 0.7,
      requirement: "Visual + genetic alignment ≥70%"
    },
    {
      check: contradictionScore < 0.2,
      requirement: "Low contradictions (<20%)"
    }
  ];
  
  const passedChecks = evidenceChecks.filter(c => c.check).length;
  const failedChecks = evidenceChecks.filter(c => !c.check);
  
  // Require at least 3 strong evidence signals for 85%+
  const meetsThreshold = passedChecks >= 3;
  
  if (!meetsThreshold) {
    missingRequirements.push(...failedChecks.map(c => c.requirement));
  }
  
  return {
    meetsThreshold,
    missingRequirements,
  };
}

/**
 * Phase 5.3.4 — Get Confidence Explanation
 * 
 * Generates user-facing explanation of what the confidence level means.
 */
export function getConfidenceExplanation(
  confidence: number,
  evidenceCheck?: { meetsThreshold: boolean; missingRequirements: string[] }
): string {
  const expectation = getConfidenceExpectation(confidence);
  
  if (confidence >= 85) {
    if (evidenceCheck && !evidenceCheck.meetsThreshold) {
      // High confidence but missing some evidence - explain why it's still high
      return `High confidence based on available evidence. ${expectation.description}.`;
    }
    return `High confidence: ${expectation.description}. Based on ${expectation.requiredEvidence.slice(0, 2).join(" and ")}.`;
  } else if (confidence >= 70) {
    return `Moderate confidence: ${expectation.description}. ${expectation.typicalScenario}.`;
  } else {
    return `Lower confidence: ${expectation.description}. Best available match based on limited evidence.`;
  }
}
