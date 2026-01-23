// Phase 5.2 — Multi-Image Guidance & Capture UX
// app/garden/scanner/ImageGuidancePanel.tsx

"use client";

import { analyzeImageSet, getAngleDisplayLabel, getAngleIcon, getAngleDescription, type ImageAngleType } from "@/lib/scanner/multiImageGuidance";

type ImageGuidancePanelProps = {
  imagePreviews: Array<{ angleLabel: string; base64?: string }>;
  maxImages?: number;
};

export default function ImageGuidancePanel({
  imagePreviews,
  maxImages = 5,
}: ImageGuidancePanelProps) {
  const guidance = analyzeImageSet(imagePreviews, maxImages);
  
  // Don't show if user has all angles and 3+ images
  if (guidance.imageCount >= 3 && guidance.missingAngles.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-4">
      {/* Primary Message */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
        <p className="text-sm font-medium text-blue-200 leading-relaxed">
          {guidance.primaryMessage}
        </p>
        {guidance.confidenceImpact && (
          <p className="text-xs text-blue-300/80 mt-2">
            {guidance.confidenceImpact}
          </p>
        )}
      </div>
      
      {/* Angle Status Indicators */}
      {guidance.imageCount > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wide">
            Angle Coverage
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {guidance.angleStatuses.map((status) => {
              const isMissing = !status.captured;
              const isRecommended = guidance.recommendedNextAngle === status.angle;
              
              return (
                <div
                  key={status.angle}
                  className={`rounded-lg border p-3 text-center transition-all ${
                    status.captured
                      ? "border-green-500/30 bg-green-500/10"
                      : isRecommended
                      ? "border-yellow-500/40 bg-yellow-500/15 border-2"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="text-2xl mb-1">
                    {getAngleIcon(status.angle)}
                  </div>
                  <div
                    className={`text-xs font-semibold mb-1 ${
                      status.captured
                        ? "text-green-300"
                        : isRecommended
                        ? "text-yellow-300"
                        : "text-white/50"
                    }`}
                  >
                    {getAngleDisplayLabel(status.angle)}
                  </div>
                  <div className="text-xs text-white/40">
                    {status.captured ? (
                      <span className="text-green-400">✓ Captured</span>
                    ) : isRecommended ? (
                      <span className="text-yellow-400">Recommended</span>
                    ) : (
                      <span>Not captured</span>
                    )}
                  </div>
                  {!status.captured && (
                    <div className="text-xs text-white/50 mt-1 leading-tight">
                      {getAngleDescription(status.angle)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Actionable Tips */}
      {guidance.actionableTips.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wide">
            Tips for Better Results
          </h4>
          <ul className="space-y-1.5">
            {guidance.actionableTips.map((tip, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs text-white/70 leading-relaxed"
              >
                <span className="text-blue-400 mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Quality Issues */}
      {guidance.qualityIssues.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wide">
            Quality Tips
          </h4>
          <div className="space-y-1.5">
            {guidance.qualityIssues.map((issue, idx) => (
              <div
                key={idx}
                className={`rounded-md border p-2 text-xs flex items-start gap-2 ${
                  issue.severity === "high"
                    ? "border-orange-500/30 bg-orange-500/10 text-orange-200"
                    : issue.severity === "medium"
                    ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-200"
                    : "border-white/10 bg-white/5 text-white/60"
                }`}
              >
                <span className="mt-0.5">
                  {issue.type === "lighting" ? "💡" : issue.type === "focus" ? "🎯" : issue.type === "distance" ? "📏" : "📐"}
                </span>
                <span>{issue.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
