import { describe, it, expect } from 'vitest';
import { validateScannerResult } from './regressionGuard';
import type { ScannerViewModel } from './viewModel';

// Mock a minimal valid result
const validResult: ScannerViewModel = {
  name: "Blue Dream",
  title: "Blue Dream",
  confidenceRange: { min: 80, max: 90, explanation: "Good match" },
  matchBasis: "Visual",
  visualMatchSummary: "Looks like Blue Dream",
  flowerStructureAnalysis: "Dense",
  trichomeDensityMaturity: "High",
  leafShapeInternode: "Narrow",
  colorPistilIndicators: "Orange",
  growthPatternClues: "Tall",
  primaryMatch: {
    name: "Blue Dream",
    confidenceRange: { min: 80, max: 90 },
    whyThisMatch: "Visual match"
  },
  secondaryMatches: [],
  trustLayer: {
    confidenceBreakdown: { visualSimilarity: 80, traitOverlap: 80, consensusStrength: 80 },
    whyThisMatch: ["Visual"],
    sourcesUsed: ["Visual"],
    confidenceLanguage: "High"
  },
  aiWikiBlend: "AI + Wiki",
  uncertaintyExplanation: "None",
  accuracyTips: [],
  confidence: 85,
  whyThisMatch: "Visual",
  morphology: "Dense",
  trichomes: "High",
  pistils: "Orange",
  structure: "Dense",
  growthTraits: ["Tall"],
  terpeneGuess: [],
  effectsShort: [],
  effectsLong: [],
  referenceStrains: [],
  genetics: { dominance: "Sativa", lineage: "Blueberry x Haze" },
  experience: { effects: [], bestFor: [] },
  disclaimer: "Disclaimer",
  nameFirstDisplay: {
    primaryStrainName: "Blue Dream",
    primaryName: "Blue Dream",
    confidencePercent: 85,
    confidence: 85,
    confidenceTier: "high",
    tagline: "High confidence",
    explanation: { whyThisNameWon: ["Visual"] }
  }
};

describe('Scanner Regression Guard', () => {
  it('should pass for a valid result', () => {
    const consoleSpy = { error: [] as any[] };
    const originalConsoleError = console.error;
    console.error = (...args) => consoleSpy.error.push(args);

    validateScannerResult(validResult, 'Test Valid');

    expect(consoleSpy.error).toHaveLength(0);
    console.error = originalConsoleError;
  });

  it('should fail if result.name is empty', () => {
    const badResult = { ...validResult, name: "" };
    
    const consoleSpy = { error: [] as any[] };
    const originalConsoleError = console.error;
    console.error = (...args) => consoleSpy.error.push(args);

    validateScannerResult(badResult, 'Test Empty Name');

    expect(consoleSpy.error).toHaveLength(1);
    expect(consoleSpy.error[0][1]).toContain("result.name is empty");
    console.error = originalConsoleError;
  });

  it('should fail if primaryStrainName is "Unknown Cultivar" with confidence > 0', () => {
    const badResult = { 
      ...validResult, 
      nameFirstDisplay: { 
        ...validResult.nameFirstDisplay, 
        primaryStrainName: "Unknown Cultivar",
        confidencePercent: 50 
      } 
    };
    
    const consoleSpy = { error: [] as any[] };
    const originalConsoleError = console.error;
    console.error = (...args) => consoleSpy.error.push(args);

    validateScannerResult(badResult, 'Test Unknown with Confidence');

    expect(consoleSpy.error).toHaveLength(1);
    expect(consoleSpy.error[0][1]).toContain('result.primaryStrainName is "Unknown Cultivar" but confidence is 50%');
    console.error = originalConsoleError;
  });

  it('should fail if primaryStrainName is empty', () => {
    const badResult = { 
      ...validResult, 
      nameFirstDisplay: { 
        ...validResult.nameFirstDisplay, 
        primaryStrainName: "" 
      } 
    };
    
    const consoleSpy = { error: [] as any[] };
    const originalConsoleError = console.error;
    console.error = (...args) => consoleSpy.error.push(args);

    validateScannerResult(badResult, 'Test Empty Primary Name');

    expect(consoleSpy.error).toHaveLength(1);
    expect(consoleSpy.error[0][1]).toContain("result.nameFirstDisplay.primaryStrainName is empty");
    console.error = originalConsoleError;
  });
});
