'use client';

import { getConfidenceLevel, getConfidenceColor, CONFIDENCE_THRESHOLDS } from '@/lib/scanner/confidence';

interface ConfidenceBadgeProps {
  confidence: number;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  showLabel?: boolean; // Show High/Medium/Low label
}

export default function ConfidenceBadge({
  confidence,
  size = 'md',
  showPercentage = true,
  showLabel = true,
}: ConfidenceBadgeProps) {
  const percentage = Math.round(confidence);
  const level = getConfidenceLevel(percentage);
  const colorClass = getConfidenceColor(level);

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${colorClass} ${sizeClasses[size]} rounded-full text-white font-semibold`}
      >
        {showLabel ? level : showPercentage ? `${percentage}%` : 'Match'}
      </div>
      {showPercentage && (
        <span className="text-sm text-gray-400">
          {showLabel ? `${percentage}%` : ''}
        </span>
      )}
      <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

