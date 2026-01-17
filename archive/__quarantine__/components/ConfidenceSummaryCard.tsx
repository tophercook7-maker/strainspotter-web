/**
 * Confidence Summary Card
 * 
 * Simple, calm UI component for displaying scanner confidence.
 * Placed under scan preview, above strain suggestions.
 * 
 * TRANSPARENCY RULES:
 * - Never shows percentages
 * - Never shows exact probabilities
 * - Never says "Confirmed"
 * - Always allows uncertainty
 */

'use client';

import Link from 'next/link';
import { ConfidenceLevel, getConfidenceLabel } from '@/lib/confidence/engine';

interface ConfidenceSummaryCardProps {
  strainName: string;
  strainSlug: string;
  confidenceLevel: ConfidenceLevel;
  explanation: string;
  hasMultipleStrains?: boolean; // Optional note about multiple similar strains
}

export default function ConfidenceSummaryCard({
  strainName,
  strainSlug,
  confidenceLevel,
  explanation,
  hasMultipleStrains = false,
}: ConfidenceSummaryCardProps) {
  // Fail-safe: If VERY_LOW, show insufficient data message
  if (confidenceLevel === 'VERY_LOW') {
    return (
      <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-6 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-2">
            Insufficient Data for Reliable Matching
          </h3>
          <p className="text-gray-400 mb-4">
            {explanation}
          </p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-white">Next Steps:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
            <li>Take another photo with better lighting and focus</li>
            <li>Try a different angle</li>
            <li>
              <Link 
                href="/strain-explorer" 
                className="text-green-400 hover:text-green-300 underline"
              >
                View Strain Explorer manually
              </Link>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // Confidence level colors (calm, no alerts)
  const confidenceColors = {
    HIGH: 'text-gray-300 border-gray-700',
    MODERATE: 'text-gray-300 border-gray-700',
    LOW: 'text-gray-400 border-gray-700',
    VERY_LOW: 'text-gray-500 border-gray-700',
  };

  const label = getConfidenceLabel(confidenceLevel);

  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-6 space-y-4">
      {/* Top Match Name */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white mb-3">{strainName}</h3>
          
          {/* Confidence Level */}
          <div className="flex items-center gap-3 mb-3">
            <span className={`px-3 py-1.5 rounded text-sm font-medium border ${confidenceColors[confidenceLevel]}`}>
              {label} Confidence
            </span>
          </div>

          {/* Explanation */}
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            {explanation}
          </p>

          {/* Optional note about multiple strains */}
          {hasMultipleStrains && (
            <p className="text-gray-400 text-xs italic mt-3">
              Multiple strains share similar characteristics.
            </p>
          )}
        </div>

        {/* Link to Strain Explorer */}
        <Link
          href={`/strain-explorer/${strainSlug}`}
          className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg font-medium hover:bg-green-500/30 transition whitespace-nowrap ml-4"
        >
          View in Explorer
        </Link>
      </div>
    </div>
  );
}

