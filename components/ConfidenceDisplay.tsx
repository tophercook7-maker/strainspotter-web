'use client';

import Link from 'next/link';
import {
  ConfidenceLevel,
  ConfidenceResult,
  AlternativeMatch,
  getConfidenceExplanationCopy,
} from '@/lib/confidence/engine';
import ScanFeedbackCollector from './ScanFeedbackCollector';

interface ConfidenceDisplayProps {
  primary: {
    name: string;
    slug: string;
    confidence: ConfidenceResult;
  };
  alternatives: AlternativeMatch[];
  noConfidentMatch?: boolean;
  showExplanation?: boolean;
  scanId?: string | null; // Optional scan ID for feedback
}

export default function ConfidenceDisplay({
  primary,
  alternatives,
  noConfidentMatch = false,
  showExplanation = true,
}: ConfidenceDisplayProps) {
  const confidenceBadgeColor = {
    HIGH: 'bg-green-500/20 text-green-400 border-green-500/50',
    MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    LOW: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  };

  const explanationCopy = getConfidenceExplanationCopy();

  if (noConfidentMatch) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white mb-2">No Confident Strain Match</h3>
          <p className="text-gray-400 mb-4">
            Unable to match with sufficient confidence.
          </p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-white mb-2">Suggestions:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
            <li>Improve photo quality (better lighting, focus)</li>
            <li>Try a different angle</li>
            <li>Ensure the strain is clearly visible</li>
          </ul>
        </div>

        {showExplanation && (
          <ConfidenceExplanation explanationCopy={explanationCopy} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary Match */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-2xl font-semibold text-white">{primary.name}</h3>
              <span
                className={`px-3 py-1 rounded text-sm font-medium border ${confidenceBadgeColor[primary.confidence.level]}`}
              >
                {primary.confidence.level} Confidence
              </span>
            </div>
            <p className="text-gray-300 mb-4">{primary.confidence.explanation}</p>
          </div>
          <Link
            href={`/strains/${primary.slug}`}
            className="px-4 py-2 bg-green-500 text-black rounded-lg font-semibold hover:bg-green-400 transition whitespace-nowrap"
          >
            View in Explorer
          </Link>
        </div>

        {/* Why This Match */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-2">Why this match:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
            {primary.confidence.reasoning.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>

        {/* Limitations */}
        {primary.confidence.limitations && primary.confidence.limitations.length > 0 && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-orange-400 mb-2">Known limitations:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
              {primary.confidence.limitations.map((limitation, idx) => (
                <li key={idx}>{limitation}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Possible Alternatives</h4>
          <div className="space-y-3">
            {alternatives.map((alt, idx) => (
              <Link
                key={idx}
                href={`/strains/${alt.slug}`}
                className="block bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{alt.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium border ${confidenceBadgeColor[alt.confidenceLevel]}`}
                      >
                        {alt.confidenceLevel}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{alt.reason}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* What Confidence Means */}
      {showExplanation && (
        <ConfidenceExplanation explanationCopy={explanationCopy} />
      )}

      {/* Feedback Collector */}
      {!noConfidentMatch && scanId && (
        <ScanFeedbackCollector
          scanId={scanId}
          primaryStrainSlug={primary.slug}
          confidenceLevel={primary.confidence.level}
        />
      )}
    </div>
  );
}

function ConfidenceExplanation({
  explanationCopy,
}: {
  explanationCopy: ReturnType<typeof getConfidenceExplanationCopy>;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <h4 className="text-lg font-semibold text-white mb-4">{explanationCopy.title}</h4>
      
      <div className="space-y-4 mb-6">
        {explanationCopy.levels.map((level, idx) => (
          <div key={idx} className="border-l-4 border-gray-700 pl-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-white">{level.level}</span>
            </div>
            <p className="text-sm text-gray-300">{level.description}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-800 pt-4">
        <h5 className="text-sm font-semibold text-gray-400 mb-2">What confidence does NOT mean:</h5>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
          {explanationCopy.disclaimers.map((disclaimer, idx) => (
            <li key={idx}>{disclaimer}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

