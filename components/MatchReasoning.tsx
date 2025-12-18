'use client';

interface MatchReasoningProps {
  reasoning: string;
  breakdown?: {
    color: number;
    text: number;
    label: number;
    web: number;
  };
}

export default function MatchReasoning({ reasoning, breakdown }: MatchReasoningProps) {
  return (
    <div className="space-y-3">
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Match Reasoning</h3>
        <p className="text-green-200">{reasoning}</p>
      </div>

      {breakdown && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Score Breakdown</h3>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Text Match</span>
                <span className="text-green-200">{breakdown.text}%</span>
              </div>
              <div className="bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-green-500 h-full rounded-full transition-all"
                  style={{ width: `${breakdown.text}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Color Similarity</span>
                <span className="text-green-200">{breakdown.color}%</span>
              </div>
              <div className="bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all"
                  style={{ width: `${breakdown.color}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Label Detection</span>
                <span className="text-green-200">{breakdown.label}%</span>
              </div>
              <div className="bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all"
                  style={{ width: `${breakdown.label}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

