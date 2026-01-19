// app/garden/scanner/WikiStyleResultPanel.tsx
// Phase 3.6 — Extensive Wiki-Style Result Expansion

"use client";

import type { ScannerViewModel } from "@/lib/scanner/viewModel";
import CollapsibleSection from "./CollapsibleSection";

interface WikiStyleResultPanelProps {
  result: ScannerViewModel;
  imageCount: number;
}

export default function WikiStyleResultPanel({
  result,
  imageCount,
}: WikiStyleResultPanelProps) {
  // Phase 3.6 Part A — Result Structure (Order Locked)
  // 1. STRAIN IDENTITY (ABOVE THE FOLD - Always visible)
  // 2-7: Collapsible sections, top 2 expanded by default

  const safeSecondaryMatches = Array.isArray(result.secondaryMatches)
    ? result.secondaryMatches
    : [];
  const safeReferenceStrains = Array.isArray(result.referenceStrains)
    ? result.referenceStrains
    : [];
  const safeTerpeneGuess = Array.isArray(result.terpeneGuess)
    ? result.terpeneGuess
    : [];
  const safeEffectsLong = Array.isArray(result.effectsLong)
    ? result.effectsLong
    : [];
  const safeGrowthTraits = Array.isArray(result.growthTraits)
    ? result.growthTraits
    : [];
  const extendedProfile = result.extendedProfile;

  // Phase 3.6 Part B — Determine strain family from name or lineage
  const getStrainFamily = (): string | null => {
    const name = result.name || "";
    if (name.toLowerCase().includes("kush")) return "Kush";
    if (name.toLowerCase().includes("cookies")) return "Cookies";
    if (name.toLowerCase().includes("haze")) return "Haze";
    if (name.toLowerCase().includes("purple")) return "Purple";
    if (name.toLowerCase().includes("blue")) return "Blue";
    if (name.toLowerCase().includes("white")) return "White";
    if (name.toLowerCase().includes("og")) return "OG";
    
    // Check lineage
    const lineage = result.genetics?.lineage || "";
    if (lineage.toLowerCase().includes("kush")) return "Kush";
    if (lineage.toLowerCase().includes("haze")) return "Haze";
    if (lineage.toLowerCase().includes("cookies")) return "Cookies";
    
    return null;
  };

  const strainFamily = getStrainFamily();

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 md:p-6 space-y-6 max-h-[85vh] overflow-y-auto max-w-4xl mx-auto">
      {/* Phase 4.3 Step 4.3.6 — NAME-FIRST DISPLAY (TOP PRIORITY) */}
      {result.nameFirstDisplay && (
        <div className="mb-6 space-y-4 pb-6 border-b border-white/10">
          {/* Strain Name (H1) */}
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            {result.nameFirstDisplay.primaryStrainName}
          </h1>
          
          {/* Confidence Badge & Tagline */}
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`text-sm font-semibold px-4 py-2 rounded-full ${
                result.nameFirstDisplay.confidenceTier === "very_high"
                  ? "bg-green-500/30 text-green-200"
                  : result.nameFirstDisplay.confidenceTier === "high"
                  ? "bg-green-500/20 text-green-300"
                  : result.nameFirstDisplay.confidenceTier === "medium"
                  ? "bg-yellow-500/20 text-yellow-300"
                  : "bg-orange-500/20 text-orange-300"
              }`}
            >
              {result.nameFirstDisplay.confidencePercent}% Confidence
            </span>
            <p className="text-sm text-white/70 italic">
              {result.nameFirstDisplay.tagline}
            </p>
          </div>
          
          {/* Alternate Matches (Phase 4.3 Step 4.3.4) */}
          {result.nameFirstDisplay.alternateMatches && result.nameFirstDisplay.alternateMatches.length > 0 && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-sm text-white/80 mb-2">
                <strong>Often confused with:</strong>{" "}
                {result.nameFirstDisplay.alternateMatches.map((alt, idx) => (
                  <span key={idx}>
                    {idx > 0 && ", "}
                    <span className="font-medium text-white/90">{alt.name}</span>
                  </span>
                ))}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Phase 3.9 Part A — CORE IDENTITY (ABOVE THE FOLD) */}
      {!result.nameFirstDisplay && (
        <div className="space-y-4 pb-4 border-b border-white/10">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              {result.name || result.title}
            </h1>

          {/* Match type label */}
          {result.namingInfo && (
            <p className="text-lg md:text-xl text-white/80 font-medium">
              {result.namingInfo.displayLabel}
            </p>
          )}

          {/* Phase 3.8 Part C — Confidence Tier Badge */}
          {result.confidenceTier && (
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  result.confidenceTier.tier === "very_high"
                    ? "bg-green-500/30 text-green-200"
                    : result.confidenceTier.tier === "high"
                    ? "bg-green-500/20 text-green-300"
                    : result.confidenceTier.tier === "medium"
                    ? "bg-yellow-500/20 text-yellow-300"
                    : "bg-orange-500/20 text-orange-300"
                }`}
              >
                {result.confidenceTier.label}
              </span>
              {result.nameResolution?.strainFamily && (
                <span className="text-xs text-white/60">
                  • {result.nameResolution.strainFamily}-type
                </span>
              )}
            </div>
          )}

          {/* Confidence & image count */}
          {result.multiImageInfo ? (
            <div className="space-y-2">
              <p className="text-sm text-white/70">
                {result.multiImageInfo.imageCountText}
              </p>
              <div className="flex items-center gap-3">
                <p className="text-2xl md:text-3xl text-green-400 font-semibold">
                  {result.multiImageInfo.confidenceRange}
                </p>
                {/* Phase 3.7 Part F — Confidence increased indicator */}
                {imageCount > 1 && (
                  <span className="text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded-full">
                    ✓ Multiple images boost
                  </span>
                )}
              </div>
              {result.multiImageInfo.improvementExplanation && (
                <div className="space-y-1">
                  <p className="text-sm text-white/80 leading-relaxed">
                    {result.multiImageInfo.improvementExplanation}
                  </p>
                  {/* Phase 3.7 Part F — Small explanation tooltip */}
                  {imageCount > 1 && (
                    <p className="text-xs text-white/60 italic">
                      💡 Multiple angles improved accuracy
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-2xl md:text-3xl text-green-400 font-semibold">
              {result.confidenceRange
                ? `${result.confidenceRange.min}–${result.confidenceRange.max}%`
                : `${result.confidence}%`}
            </p>
          )}

          {/* Rationale */}
          {result.namingInfo?.rationale && (
            <p className="text-base md:text-lg text-white/90 leading-relaxed">
              {result.namingInfo.rationale}
            </p>
          )}
        </div>
        </div>
      )}

      {/* Phase 3.8 Part E — Why This Match (Expandable) */}
        {result.nameReasoning && result.nameReasoning.bullets.length > 0 && (
          <CollapsibleSection
            title="Why This Name?"
            defaultExpanded={true}
            icon="💡"
          >
            <ul className="space-y-2">
              {result.nameReasoning.bullets.map((bullet, idx) => (
                <li key={idx} className="text-white/80 text-sm flex items-start gap-2">
                  <span className="text-white/40 mt-1">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* Phase 3.8 Part E — Closest Alternatives (Collapsed) */}
        {(safeSecondaryMatches.length > 0 || result.nameResolution?.closestAlternate) && (
          <CollapsibleSection
            title="Closest Alternatives"
            defaultExpanded={false}
            icon="🔍"
          >
            <div className="space-y-3">
              {/* Show name resolution alternate first if available */}
              {result.nameResolution?.closestAlternate && (
                <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-semibold text-white">
                      {result.nameResolution.closestAlternate.name}
                    </p>
                    <span className="text-xs text-white/60">
                      {result.nameResolution.closestAlternate.confidence}%
                    </span>
                  </div>
                  <p className="text-sm text-white/70">
                    {result.nameResolution.closestAlternate.whyNotPrimary}
                  </p>
                </div>
              )}
              
              {/* Show other alternates */}
              {safeSecondaryMatches.slice(0, 3).map((match, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-white/10 bg-white/5">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-semibold text-white">{match.name}</p>
                  </div>
                  {match.whyNotPrimary && (
                    <p className="text-sm text-white/70">{match.whyNotPrimary}</p>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

      {/* Phase 3.6 Part C — GENETICS & LINEAGE (Expanded by default) */}
      <CollapsibleSection
        title="Genetics & Lineage"
        defaultExpanded={true}
        icon="🧬"
      >
        <div className="space-y-4">
          {/* Dominance & Lineage */}
          <div>
            <h4 className="text-base font-semibold text-white/90 mb-2">
              Dominance Type
            </h4>
            <p className="text-white/80 leading-relaxed">
              This cultivar is classified as{" "}
              <strong className="text-white">
                {result.genetics?.dominance || "Unknown"}
              </strong>
              {result.genetics?.dominance !== "Unknown" &&
                `-dominant, which influences both its physical structure and expected effects. ${result.genetics?.dominance === "Indica" ? "Indica-dominant strains typically produce broad leaves, dense buds, and relaxing body effects." : result.genetics?.dominance === "Sativa" ? "Sativa-dominant strains usually feature narrow leaves, elongated structure, and uplifting cerebral effects." : "Hybrids combine traits from both genetic lineages, offering balanced characteristics."}`
              }
            </p>
          </div>

          {/* Parent Strains & Family Tree */}
          {(extendedProfile?.genetics.lineage ||
            result.genetics?.lineage ||
            result.familyTree) && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Parent Strains & Family Tree
              </h4>
              <p className="text-white/80 leading-relaxed mb-2">
                {result.familyTree ||
                  extendedProfile?.genetics.lineage ||
                  result.genetics?.lineage ||
                  "Lineage information not available."}
              </p>
              {(extendedProfile?.genetics.lineage || result.genetics?.lineage) && (
                <p className="text-white/80 leading-relaxed text-sm">
                  This genetic combination contributes to the distinctive traits observed in this cultivar. The parent strains influence the plant's morphology, effects, and cultivation characteristics.
                </p>
              )}
            </div>
          )}

          {/* Phenotype Expression */}
          <div>
            <h4 className="text-base font-semibold text-white/90 mb-2">
              Typical Phenotype Expression
            </h4>
            <p className="text-white/80 leading-relaxed">
              {result.genetics?.dominance === "Indica"
                ? "Indica-dominant phenotypes typically display compact, bushy growth with dense, resinous flower clusters. Leaves are broad and dark green, with tight internodal spacing. Bud structure is usually dense and heavy, with high trichome production."
                : result.genetics?.dominance === "Sativa"
                ? "Sativa-dominant phenotypes often show tall, lanky growth patterns with elongated flower clusters. Leaves are narrow and light green, with wider internodal spacing. Bud structure tends to be airier and less dense than indica varieties."
                : "Hybrid phenotypes can vary significantly depending on the specific genetic ratio. Some express more indica-like traits (dense structure, broad leaves), while others lean sativa (elongated structure, narrow leaves). The observed characteristics help determine the dominant influence."}
            </p>
          </div>

          {/* Breeder Origins */}
          {extendedProfile?.genetics.breederNotes &&
            extendedProfile.genetics.breederNotes.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Known Origins & History
                </h4>
                <div className="space-y-2">
                  {extendedProfile.genetics.breederNotes.map((note, idx) => (
                    <p key={idx} className="text-white/80 leading-relaxed">
                      {note}
                    </p>
                  ))}
                </div>
              </div>
            )}

          {/* Uncertainty Note */}
          {(!extendedProfile?.genetics.lineage && !result.genetics?.lineage) && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
              <p className="text-sm text-yellow-200 leading-relaxed">
                <strong>Lineage Inference Limitation:</strong> Genetic lineage
                identification from visual analysis alone has limitations. Parent
                strain information would require genetic testing or documented
                breeding records. The dominance type (Indica/Sativa/Hybrid) is
                inferred from observable morphological traits.
              </p>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Phase 3.6 Part D — VISUAL & MORPHOLOGY ANALYSIS (Expanded by default) */}
      <CollapsibleSection
        title="Visual & Morphology Analysis"
        defaultExpanded={true}
        icon="🔬"
      >
        <div className="space-y-4">
          <p className="text-sm text-white/60 italic mb-4">
            Based solely on visual analysis of {imageCount} image
            {imageCount > 1 ? "s" : ""}. These traits directly informed the
            match decision.
          </p>

          {/* Bud Density & Structure */}
          {(result.flowerStructureAnalysis ||
            result.primaryMatch?.whyThisMatch) && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Bud Density & Structure
              </h4>
              <p className="text-white/80 leading-relaxed">
                {result.flowerStructureAnalysis ||
                  `The observed bud structure shows ${result.morphology || "characteristics that align with known cultivars"}. This structural pattern was a key factor in the identification process.`}
              </p>
            </div>
          )}

          {/* Calyx Structure */}
          {result.structure && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Calyx Formation
              </h4>
              <p className="text-white/80 leading-relaxed">{result.structure}</p>
            </div>
          )}

          {/* Trichome Coverage */}
          {(result.trichomeDensityMaturity || result.trichomes) && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Trichome Coverage & Maturity
              </h4>
              <p className="text-white/80 leading-relaxed">
                {result.trichomeDensityMaturity ||
                  result.trichomes ||
                  "Trichome density and coverage are key indicators of resin production and maturity stage."}
              </p>
            </div>
          )}

          {/* Pistil Color & Maturity */}
          {(result.colorPistilIndicators || result.pistils) && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Pistil Color & Maturity Indicators
              </h4>
              <p className="text-white/80 leading-relaxed">
                {result.colorPistilIndicators ||
                  result.pistils ||
                  "Pistil coloration provides clues about flowering stage and can indicate strain characteristics."}
              </p>
            </div>
          )}

          {/* Leaf Shape Indicators */}
          {result.leafShapeInternode && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Leaf Shape & Internodal Spacing
              </h4>
              <p className="text-white/80 leading-relaxed">
                {result.leafShapeInternode}
              </p>
            </div>
          )}

          {/* Coloration */}
          {extendedProfile?.morphology.coloration && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Coloration Profile
              </h4>
              <p className="text-white/80 leading-relaxed">
                {extendedProfile.morphology.coloration}
                {extendedProfile.morphology.coloration.includes("purple") ||
                extendedProfile.morphology.coloration.includes("blue")
                  ? " These color variations can indicate specific genetic traits or environmental influences during growth."
                  : ""}
              </p>
            </div>
          )}

          {/* Match Decision Tie-in */}
          {result.primaryMatch?.whyThisMatch && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
              <p className="text-sm text-green-200 leading-relaxed">
                <strong>Match Decision:</strong> {result.primaryMatch.whyThisMatch}
              </p>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Phase 3.6 Part E — TERPENE & CANNABINOID PROFILE */}
      <CollapsibleSection
        title="Terpene & Cannabinoid Profile"
        defaultExpanded={false}
        icon="🌿"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 mb-4">
            <p className="text-sm text-yellow-200 leading-relaxed font-semibold">
              ⚠️ Inferred Profile — Not Lab Tested
            </p>
            <p className="text-sm text-yellow-200/90 leading-relaxed mt-1">
              The following profile is inferred from visual characteristics and
              known strain data. Actual terpene and cannabinoid levels require
              laboratory testing to confirm.
            </p>
          </div>

          {/* Dominant Terpenes */}
          {(extendedProfile?.terpeneProfile.primary.length > 0 ||
            safeTerpeneGuess.length > 0) && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Likely Dominant Terpenes
              </h4>
              <p className="text-white/80 leading-relaxed mb-2">
                Based on strain characteristics and visual indicators, this
                cultivar likely features the following terpenes:
              </p>
              <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                {(extendedProfile?.terpeneProfile.primary || safeTerpeneGuess)
                  .slice(0, 5)
                  .map((terpene, idx) => (
                    <li key={idx}>
                      <strong>{terpene}</strong>
                      {terpene.toLowerCase().includes("myrcene")
                        ? " — Often associated with earthy, musky aromas and relaxing effects"
                        : terpene.toLowerCase().includes("pinene")
                        ? " — Typically produces pine, woodsy scents and may promote alertness"
                        : terpene.toLowerCase().includes("limonene")
                        ? " — Citrusy, bright aromas often linked to mood elevation"
                        : terpene.toLowerCase().includes("caryophyllene")
                        ? " — Spicy, peppery notes that may interact with the body's endocannabinoid system"
                        : terpene.toLowerCase().includes("linalool")
                        ? " — Floral, lavender-like scents associated with calming effects"
                        : ""}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Aroma Description */}
          {extendedProfile?.terpeneProfile.aromaDescription && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Expected Aroma & Flavor
              </h4>
              <p className="text-white/80 leading-relaxed">
                {extendedProfile.terpeneProfile.aromaDescription}
              </p>
            </div>
          )}

          {/* Estimated Cannabinoid Ranges */}
          {extendedProfile?.cannabinoidProfile && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Estimated Cannabinoid Ranges
              </h4>
              <div className="space-y-2 text-white/80">
                {extendedProfile.cannabinoidProfile.thcRange && (
                  <p>
                    <strong>THC:</strong> {extendedProfile.cannabinoidProfile.thcRange}
                  </p>
                )}
                {extendedProfile.cannabinoidProfile.cbdRange && (
                  <p>
                    <strong>CBD:</strong> {extendedProfile.cannabinoidProfile.cbdRange}
                  </p>
                )}
                {extendedProfile.cannabinoidProfile.minorCannabinoids &&
                  extendedProfile.cannabinoidProfile.minorCannabinoids.length >
                    0 && (
                    <div>
                      <p className="mb-1">
                        <strong>Minor Cannabinoids:</strong>
                      </p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        {extendedProfile.cannabinoidProfile.minorCannabinoids.map(
                          (cannabinoid, idx) => (
                            <li key={idx}>{cannabinoid}</li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
              </div>
              <p className="text-sm text-white/60 italic mt-2">
                These ranges are typical for this strain type but can vary
                significantly based on growing conditions, harvest timing, and
                phenotype expression.
              </p>
            </div>
          )}
          
          {/* Phase 3.9 Part D — Entourage Effect Explanation */}
          {result.entourageExplanation && (
            <div className="mt-4 p-3 rounded-lg border border-blue-500/30 bg-blue-500/10">
              <h4 className="text-base font-semibold text-blue-200 mb-2">
                The Entourage Effect
              </h4>
              <p className="text-sm text-blue-200/90 leading-relaxed">
                {result.entourageExplanation}
              </p>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Phase 3.6 Part F — EXPECTED EFFECTS & USE CASES */}
      <CollapsibleSection
        title="Expected Effects & Use Cases"
        defaultExpanded={false}
        icon="✨"
      >
        <div className="space-y-4">
          {/* Primary Effects */}
          {extendedProfile?.effects.primary &&
            extendedProfile.effects.primary.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Primary Effects
                </h4>
                <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                  {extendedProfile.effects.primary.map((effect, idx) => (
                    <li key={idx}>{effect}</li>
                  ))}
                </ul>
              </div>
            )}

          {/* Secondary Effects */}
          {(extendedProfile?.effects.secondary?.length > 0 ||
            safeEffectsLong.length > 0) && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Secondary Effects
              </h4>
              <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                {(
                  extendedProfile?.effects.secondary ||
                  safeEffectsLong
                ).map((effect, idx) => (
                  <li key={idx}>{effect}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Use Cases */}
          {extendedProfile?.commonUseCases &&
            extendedProfile.commonUseCases.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Common Use Cases
                </h4>
                <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                  {extendedProfile.commonUseCases.map((useCase, idx) => (
                    <li key={idx}>{useCase}</li>
                  ))}
                </ul>
              </div>
            )}

          {/* Onset & Duration */}
          {(extendedProfile?.effects.onset ||
            extendedProfile?.effects.duration) && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Experience Characteristics
              </h4>
              <div className="space-y-2 text-white/80">
                {extendedProfile.effects.onset && (
                  <p>
                    <strong>Onset:</strong> {extendedProfile.effects.onset}
                  </p>
                )}
                {extendedProfile.effects.duration && (
                  <p>
                    <strong>Duration:</strong> {extendedProfile.effects.duration}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Phase 3.9 Part E — Mental vs Body Balance */}
          <div>
            <h4 className="text-base font-semibold text-white/90 mb-2">
              Mental vs Body Balance
            </h4>
            <p className="text-white/80 leading-relaxed">
              {result.genetics?.dominance === "Indica"
                ? "This cultivar tends to produce primarily body-focused effects with a strong physical relaxation component. While some mental effects may be present, the body sensations typically dominate the experience."
                : result.genetics?.dominance === "Sativa"
                ? "This cultivar typically produces cerebral, mental effects with energizing qualities. Physical effects are usually minimal, allowing for active engagement and creative thinking."
                : "This hybrid cultivar offers a balanced combination of mental and body effects. The specific balance can vary between phenotypes, with some leaning more toward cerebral stimulation and others toward physical relaxation."}
            </p>
          </div>
          
          {/* Phase 3.9 Part E — Variability Notes */}
          <div>
            <h4 className="text-base font-semibold text-white/90 mb-2">
              Why Effects Can Feel Different
            </h4>
            <p className="text-white/80 leading-relaxed">
              Individual experiences with this cultivar can vary significantly due to several factors. Personal tolerance, metabolism, consumption method (smoking, vaping, edibles), dosage, and even time of day can influence how effects are perceived. Additionally, phenotype variations within the same genetic lineage may produce slightly different cannabinoid and terpene ratios, leading to nuanced differences in effects. Environmental factors during cultivation—such as nutrient schedules, light cycles, and harvest timing—also contribute to variation in the final product.
            </p>
          </div>
          
          {/* Who It's Best For */}
          {result.experience?.bestFor &&
            result.experience.bestFor.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Typically Best For
                </h4>
                <p className="text-white/80 leading-relaxed">
                  {result.experience.bestFor.join(", ")}
                  . These use cases are commonly reported for this strain type
                  and may vary based on individual tolerance, dosage, and
                  consumption method.
                </p>
              </div>
            )}
        </div>
      </CollapsibleSection>
      
      {/* Phase 3.9 Part F — COMMON USE CASES (Detailed) */}
      <CollapsibleSection
        title="Common Use Cases"
        defaultExpanded={false}
        icon="📋"
      >
        <div className="space-y-4">
          {/* Day vs Night Use */}
          <div>
            <h4 className="text-base font-semibold text-white/90 mb-2">
              Day vs Night Use
            </h4>
            <p className="text-white/80 leading-relaxed">
              {result.genetics?.dominance === "Indica"
                ? "This cultivar is generally best suited for evening or nighttime use due to its relaxing and potentially sedative effects. It may interfere with daytime productivity or alertness."
                : result.genetics?.dominance === "Sativa"
                ? "This cultivar is well-suited for daytime use, as it typically provides energizing and uplifting effects without heavy sedation. It can enhance focus and creativity during active hours."
                : "This hybrid cultivar can work for both day and night use depending on the specific phenotype and individual response. Some may find it suitable for afternoon or early evening, while others may prefer it for relaxed evening activities."}
            </p>
          </div>
          
          {/* Creativity / Focus / Relaxation */}
          <div>
            <h4 className="text-base font-semibold text-white/90 mb-2">
              Activity Suitability
            </h4>
            <div className="space-y-2 text-white/80">
              {result.genetics?.dominance === "Indica" ? (
                <>
                  <p><strong>Creativity:</strong> Lower stimulation may limit creative bursts; better for reflective, contemplative creative work.</p>
                  <p><strong>Focus:</strong> Not ideal for tasks requiring sharp focus; better for relaxation and stress relief.</p>
                  <p><strong>Relaxation:</strong> Excellent for unwinding, stress relief, and physical relaxation after activities.</p>
                </>
              ) : result.genetics?.dominance === "Sativa" ? (
                <>
                  <p><strong>Creativity:</strong> Excellent for stimulating creative thinking, brainstorming, and artistic activities.</p>
                  <p><strong>Focus:</strong> Can enhance focus and productivity for engaging tasks, though effects vary by individual.</p>
                  <p><strong>Relaxation:</strong> Mental relaxation possible, but physical relaxation is typically minimal.</p>
                </>
              ) : (
                <>
                  <p><strong>Creativity:</strong> Moderate creative enhancement depending on phenotype balance.</p>
                  <p><strong>Focus:</strong> Can support focus for engaging tasks, with effects varying by individual and dosage.</p>
                  <p><strong>Relaxation:</strong> Balanced relaxation—mental calm with moderate physical relaxation.</p>
                </>
              )}
            </div>
          </div>
          
          {/* Social vs Solo */}
          <div>
            <h4 className="text-base font-semibold text-white/90 mb-2">
              Social vs Solo Contexts
            </h4>
            <p className="text-white/80 leading-relaxed">
              {result.genetics?.dominance === "Indica"
                ? "This cultivar is typically better suited for solo or small-group settings where relaxation and introspection are desired. Large social gatherings may feel overwhelming."
                : result.genetics?.dominance === "Sativa"
                ? "This cultivar can enhance social experiences by promoting conversation, energy, and engagement. It's well-suited for group activities and social gatherings."
                : "This hybrid cultivar can work in both social and solo contexts, with effects varying based on the specific balance of indica and sativa traits. It offers flexibility for different social situations."}
            </p>
          </div>
        </div>
      </CollapsibleSection>
      
      {/* Phase 3.9 Part G — VARIANTS & CLOSE RELATIVES */}
      {(result.relatedStrains && result.relatedStrains.length > 0) || 
       (extendedProfile?.knownVariations && extendedProfile.knownVariations.length > 0) ? (
        <CollapsibleSection
          title="Variants & Close Relatives"
          defaultExpanded={false}
          icon="🌳"
        >
          <div className="space-y-4">
            {/* Related Strains */}
            {result.relatedStrains && result.relatedStrains.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Closely Related Strains
                </h4>
                <div className="space-y-3">
                  {result.relatedStrains.map((related, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-white/10 bg-white/5">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-semibold text-white">{related.name}</p>
                        <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded">
                          {related.relationship}
                        </span>
                      </div>
                      <p className="text-sm text-white/70">{related.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Phenotype Variations */}
            {extendedProfile?.knownVariations && extendedProfile.knownVariations.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Phenotype Variations
                </h4>
                <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                  {extendedProfile.knownVariations.map((variation, idx) => (
                    <li key={idx}>{variation}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsibleSection>
      ) : null}

      {/* Phase 3.6 Part G — GROWTH & CULTIVATION NOTES */}
      <CollapsibleSection
        title="Growth & Cultivation Notes"
        defaultExpanded={false}
        icon="🌱"
      >
        <div className="space-y-4">
          {extendedProfile?.cultivationNotes ? (
            <>
              {/* Indoor vs Outdoor */}
              {extendedProfile.cultivationNotes.indoorOutdoor && (
                <div>
                  <h4 className="text-base font-semibold text-white/90 mb-2">
                    Indoor vs Outdoor Tendencies
                  </h4>
                  <p className="text-white/80 leading-relaxed">
                    {extendedProfile.cultivationNotes.indoorOutdoor}
                  </p>
                </div>
              )}

              {/* Flowering Time */}
              {extendedProfile.cultivationNotes.floweringTime && (
                <div>
                  <h4 className="text-base font-semibold text-white/90 mb-2">
                    Flowering Time Range
                  </h4>
                  <p className="text-white/80 leading-relaxed">
                    {extendedProfile.cultivationNotes.floweringTime}
                  </p>
                </div>
              )}

              {/* Yield Expectations */}
              {extendedProfile.cultivationNotes.yieldEstimate && (
                <div>
                  <h4 className="text-base font-semibold text-white/90 mb-2">
                    Yield Expectations
                  </h4>
                  <p className="text-white/80 leading-relaxed">
                    {extendedProfile.cultivationNotes.yieldEstimate}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div>
              <p className="text-white/80 leading-relaxed">
                Growth stage and cultivation details are limited by the visible
                characteristics in the provided image
                {imageCount > 1 ? "s" : ""}. To provide detailed cultivation
                notes, images showing the full plant structure, growth medium,
                and environmental conditions would be helpful.
              </p>
            </div>
          )}

          {/* Known Sensitivities */}
          {extendedProfile?.knownVariations &&
            extendedProfile.knownVariations.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Known Variations & Sensitivities
                </h4>
                <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                  {extendedProfile.knownVariations.map((variation, idx) => (
                    <li key={idx}>{variation}</li>
                  ))}
                </ul>
              </div>
            )}

          {/* Growth Traits from Analysis */}
          {safeGrowthTraits.length > 0 && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Observed Growth Characteristics
              </h4>
              <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                {safeGrowthTraits.map((trait, idx) => (
                  <li key={idx}>{trait}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Phase 3.9 Part H — CONFIDENCE & DISCLAIMERS */}
      <CollapsibleSection
        title="Confidence & Disclaimers"
        defaultExpanded={false}
        icon="ℹ️"
      >
        <div className="space-y-4">
          {/* Confidence Tier */}
          {result.confidenceTier && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Confidence Assessment
              </h4>
              <div className="p-3 rounded-lg border border-white/10 bg-white/5 mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      result.confidenceTier.tier === "high"
                        ? "bg-green-500/20 text-green-300"
                    : result.confidenceTier.tier === "medium"
                    ? "bg-yellow-500/20 text-yellow-300"
                    : "bg-orange-500/20 text-orange-300"
                    }`}
                  >
                    {result.confidenceTier.label}
                  </span>
                  <span className="text-sm text-white/60">
                    {result.confidenceRange
                      ? `${result.confidenceRange.min}–${result.confidenceRange.max}%`
                      : `${result.confidence}%`}
                  </span>
                </div>
                <p className="text-sm text-white/70">
                  {result.confidenceTier.description}
                </p>
              </div>
            </div>
          )}
          
          {/* What Increased Confidence */}
          {imageCount > 1 && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                What Increased Confidence
              </h4>
              <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                {imageCount >= 2 && (
                  <li>Multiple images ({imageCount}) provided cross-validation</li>
                )}
                {result.multiImageInfo?.improvementExplanation && (
                  <li>{result.multiImageInfo.improvementExplanation}</li>
                )}
                {result.nameResolution?.matchType === "clear_winner" && (
                  <li>Strong consensus across all analyzed images</li>
                )}
                {result.confidenceTier?.tier === "high" && (
                  <li>High visual trait alignment with known cultivar characteristics</li>
                )}
              </ul>
            </div>
          )}
          
          {/* What Reduced Certainty */}
          <div>
            <h4 className="text-base font-semibold text-white/90 mb-2">
              What Reduced Certainty
            </h4>
            <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
              {imageCount === 1 && (
                <li>Single image analysis limits perspective and cross-validation</li>
              )}
              {result.confidenceTier?.tier === "low" && (
                <li>Visual traits showed significant variation or ambiguity</li>
              )}
              {result.nameResolution?.matchType === "family_level" && (
                <li>Specific cultivar identification uncertain; family-level match provided</li>
              )}
              <li>Phenotype variation within strains can create visual ambiguity</li>
              <li>Visual analysis cannot confirm genetic identity without laboratory testing</li>
            </ul>
          </div>
          
          {/* Non-Lab Disclaimer */}
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <h4 className="text-base font-semibold text-yellow-200 mb-2">
              Important: Visual Identification Only
            </h4>
            <p className="text-sm text-yellow-200/90 leading-relaxed">
              This identification is based solely on visual analysis of morphological characteristics. While visual traits provide strong indicators, definitive cultivar identification requires genetic testing or documented breeding records. The confidence level reflects the strength of visual alignment, not absolute certainty. Cannabinoid and terpene profiles, effects, and cultivation characteristics are inferred from known strain data and may vary significantly between phenotypes and growing conditions.
            </p>
          </div>

          {/* Phenotype Variation */}
          <div>
            <h4 className="text-base font-semibold text-white/90 mb-2">
              Phenotype Variation
            </h4>
            <p className="text-white/80 leading-relaxed">
              Cannabis plants of the same genetic lineage can display different
              physical characteristics (phenotypes) based on environmental
              factors during growth. Light intensity, temperature, humidity,
              nutrient availability, and harvest timing all influence the final
              appearance. This means two plants with identical genetics may look
              different, while two different strains might appear similar under
              certain conditions.
            </p>
          </div>

          {/* Environmental Effects */}
          <div>
            <h4 className="text-base font-semibold text-white/90 mb-2">
              Environmental Effects on Appearance
            </h4>
            <p className="text-white/80 leading-relaxed">
              Growing conditions significantly impact visual traits. Indoor
              cultivation with controlled environments often produces different
              bud structures and coloration than outdoor grows. Stress factors
              (nutrient deficiencies, light burn, temperature fluctuations) can
              alter leaf coloration, trichome density, and overall morphology.
              The images analyzed represent a single moment in time and may not
              reflect the full range of characteristics this cultivar can
              express.
            </p>
          </div>

          {/* Multiple Images Benefit */}
          {imageCount > 1 && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
              <h4 className="text-base font-semibold text-green-200 mb-2">
                Multiple Images Improve Accuracy
              </h4>
              <p className="text-sm text-green-200/90 leading-relaxed">
                Analyzing {imageCount} images from different angles provides a
                more comprehensive view of the plant's characteristics. When
                multiple images agree on key traits (bud structure, trichome
                density, coloration), confidence in the identification increases.
                Disagreement between images indicates natural variation or
                different growth stages, which is accounted for in the
                confidence range.
              </p>
            </div>
          )}

          {/* Disclaimers */}
          {extendedProfile?.disclaimers &&
            extendedProfile.disclaimers.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-white/90 mb-2">
                  Important Disclaimers
                </h4>
                <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                  {extendedProfile.disclaimers.map((disclaimer, idx) => (
                    <li key={idx}>{disclaimer}</li>
                  ))}
                </ul>
              </div>
            )}

          {/* Sources */}
          {result.trustLayer?.sourcesUsed &&
            result.trustLayer.sourcesUsed.length > 0 && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-white/60">
                  <strong>Sources:</strong>{" "}
                  {result.trustLayer.sourcesUsed.join(", ")}
                </p>
              </div>
            )}
        </div>
      </CollapsibleSection>
    </section>
  );
}
