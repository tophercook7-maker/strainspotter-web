'use client';

interface ConfidenceBadgeProps {
  confidence: number;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
}

export default function ConfidenceBadge({
  confidence,
  size = 'md',
  showPercentage = true,
}: ConfidenceBadgeProps) {
  const percentage = Math.round(confidence);
  const colorClass =
    percentage >= 80
      ? 'bg-green-500'
      : percentage >= 60
        ? 'bg-yellow-500'
        : percentage >= 40
          ? 'bg-orange-500'
          : 'bg-red-500';

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
        {showPercentage ? `${percentage}%` : 'Match'}
      </div>
      <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

