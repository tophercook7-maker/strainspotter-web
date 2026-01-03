'use client';

import { useState } from 'react';

export type FeedbackType = 'RIGHT' | 'UNSURE' | 'WRONG';
export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

interface ScanFeedbackCollectorProps {
  scanId: string | null;
  primaryStrainSlug: string;
  confidenceLevel: ConfidenceLevel;
  onFeedbackSubmitted?: () => void;
}

export default function ScanFeedbackCollector({
  scanId,
  primaryStrainSlug,
  confidenceLevel,
  onFeedbackSubmitted,
}: ScanFeedbackCollectorProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackType | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't show if no scan_id (e.g., preview mode)
  if (!scanId) {
    return null;
  }

  const handleSubmit = async (feedbackType: FeedbackType) => {
    if (submitting || submitted) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/scan-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scan_id: scanId,
          primary_strain_slug: primaryStrainSlug,
          confidence_level_at_scan: confidenceLevel,
          feedback_type: feedbackType,
          optional_note: note.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to submit feedback' }));
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      setSelectedFeedback(feedbackType);
      setSubmitted(true);
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted();
      }
    } catch (err: any) {
      console.error('[ScanFeedback] Error:', err);
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="text-center">
          <p className="text-green-400 mb-2">✓ Thank you for your feedback</p>
          <p className="text-sm text-gray-400">
            This helps improve future scans.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-white mb-2">Was this match helpful?</h4>
        <p className="text-xs text-gray-400 mb-4">
          This feedback helps improve future scans. It does not change this result.
        </p>
      </div>

      {/* Feedback Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleSubmit('RIGHT')}
          disabled={submitting}
          className={`
            flex-1 px-4 py-3 rounded-lg border transition
            ${selectedFeedback === 'RIGHT'
              ? 'bg-green-500/20 border-green-500 text-green-400'
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
            }
            ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span className="text-lg mb-1 block">👍</span>
          <span className="text-sm font-medium">Looks Right</span>
        </button>

        <button
          onClick={() => handleSubmit('UNSURE')}
          disabled={submitting}
          className={`
            flex-1 px-4 py-3 rounded-lg border transition
            ${selectedFeedback === 'UNSURE'
              ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
            }
            ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span className="text-lg mb-1 block">🤔</span>
          <span className="text-sm font-medium">Unsure</span>
        </button>

        <button
          onClick={() => handleSubmit('WRONG')}
          disabled={submitting}
          className={`
            flex-1 px-4 py-3 rounded-lg border transition
            ${selectedFeedback === 'WRONG'
              ? 'bg-red-500/20 border-red-500 text-red-400'
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
            }
            ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span className="text-lg mb-1 block">👎</span>
          <span className="text-sm font-medium">Looks Wrong</span>
        </button>
      </div>

      {/* Optional Note */}
      {selectedFeedback && !submitted && (
        <div className="space-y-2">
          <label className="block text-sm text-gray-400">
            Add a note (optional, private)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any additional context..."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none"
            rows={3}
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleSubmit(selectedFeedback)}
              disabled={submitting}
              className="px-4 py-2 bg-green-500 text-black rounded-lg font-semibold hover:bg-green-400 transition disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
            <span className="text-xs text-gray-500">{note.length}/500</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/40 border border-red-500/40 rounded-lg p-3">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}
    </div>
  );
}

