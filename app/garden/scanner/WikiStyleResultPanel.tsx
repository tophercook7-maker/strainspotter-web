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
    <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 md:p-6 space-y-6 max-h-[85vh] overflow-y-auto">
      {/* Phase 3.6 Part B — STRAIN IDENTITY (ABOVE THE FOLD) */}
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

          {/* Confidence & image count */}
          {result.multiImageInfo ? (
            <div className="space-y-2">
              <p className="text-sm text-white/70">
                {result.multiImageInfo.imageCountText}
              </p>
              <p className="text-2xl md:text-3xl text-green-400 font-semibold">
                {result.multiImageInfo.confidenceRange}
              </p>
              {result.multiImageInfo.improvementExplanation && (
                <p className="text-sm text-white/80 leading-relaxed">
                  {result.multiImageInfo.improvementExplanation}
                </p>
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

        {/* Alternate matches & strain family */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          {/* Alternate matches */}
          {safeSecondaryMatches.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/70 mb-2 uppercase tracking-wide">
                Also Similar To
              </h3>
              <ul className="space-y-1">
                {safeSecondaryMatches.slice(0, 3).map((match, idx) => (
                  <li key={idx} className="text-white/80 text-sm">
                    • {match.name}
                    {match.whyNotPrimary && (
                      <span className="text-white/60 ml-2">
                        ({match.whyNotPrimary})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Strain family */}
          {strainFamily && (
            <div>
              <h3 className="text-sm font-semibold text-white/70 mb-2 uppercase tracking-wide">
                Strain Family
              </h3>
              <p className="text-white/80 text-sm">{strainFamily}-type</p>
            </div>
          )}
        </div>
      </div>

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

          {/* Parent Strains */}
          {(extendedProfile?.genetics.lineage ||
            result.genetics?.lineage) && (
            <div>
              <h4 className="text-base font-semibold text-white/90 mb-2">
                Parent Strains & Lineage
              </h4>
              <p className="text-white/80 leading-relaxed">
                {extendedProfile?.genetics.lineage ||
                  result.genetics?.lineage ||
                  "Lineage information not available."}
                {extendedProfile?.genetics.lineage
                  ? " This genetic combination contributes to the distinctive traits observed in this cultivar."
                  : result.genetics?.lineage
                  ? " The parent strains influence the plant's morphology, effects, and cultivation characteristics."
                  : ""}
              </p>
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

      {/* Phase 3.6 Part H — CONFIDENCE & VARIATION */}
      <CollapsibleSection
        title="Confidence, Variation & Disclaimers"
        defaultExpanded={false}
        icon="ℹ️"
      >
        <div className="space-y-4">
          {/* Why Confidence Isn't Absolute */}
          <div>
            <h4 className="text-base font-semibold text-white/90 mb-2">
              Why Confidence Isn't Absolute
            </h4>
            <p className="text-white/80 leading-relaxed">
              {result.uncertaintyExplanation ||
                `Visual identification has inherent limitations. The confidence range of ${result.confidenceRange?.min || result.confidence}–${result.confidenceRange?.max || result.confidence}% reflects these uncertainties: cannabis cultivars can exhibit significant phenotypic variation even within the same strain, and visual traits alone cannot definitively confirm genetic identity without laboratory testing.`}
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
