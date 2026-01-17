/**
 * Scanner Feedback → Learning Loop
 * 
 * Signal-collection system for pattern recognition improvement.
 * Users express confidence alignment, not ground truth validation.
 * 
 * LANGUAGE RULES:
 * - Allowed: "Aligned", "Didn't match", "Unsure"
 * - Disallowed: "Correct/Incorrect", "Right/Wrong", "Confirm strain"
 */

'use client';

import { useState } from 'react';
import { ConfidenceLevel } from '@/lib/confidence/engine';
import { mapConfidenceLevelToDB } from '@/lib/confidence/mapping';

export type FeedbackSignal = 'ALIGNED' | 'UNSURE' | 'MISMATCH';

interface ScanFeedbackCollectorProps {
  scanId: string | null;
  confidenceLevel: ConfidenceLevel;
  onFeedbackSubmitted?: () => void;
}

export default function ScanFeedbackCollector({
  scanId,
  confidenceLevel,
  onFeedbackSubmitted,
}: ScanFeedbackCollectorProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackSignal | null>(null);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't show if no scan_id (e.g., preview mode)
  if (!scanId) {
    return null;
  }

  const handleSubmit = async (feedbackSignal: FeedbackSignal) => {
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
          confidence_level: mapConfidenceLevelToDB(confidenceLevel),
          feedback_signal: feedbackSignal,
          optional_note: showNote && note.trim() ? note.trim() : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to submit feedback' }));
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      setSelectedFeedback(feedbackSignal);
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
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
        <div className="text-center">
          <p className="text-gray-300 text-sm">Thank you for your feedback.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 space-y-4">
      {/* Main Prompt */}
      <div>
        <h4 className="text-sm font-medium text-white mb-4">How did this result feel?</h4>
        
        {/* Feedback Buttons */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => handleSubmit('ALIGNED')}
            disabled={submitting}
            className={`
              flex-1 px-4 py-3 rounded-lg border transition
              ${selectedFeedback === 'ALIGNED'
                ? 'bg-green-500/20 border-green-500/50 text-green-400'
                : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'
              }
              ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="text-lg mb-1 block">👍</span>
            <span className="text-sm font-medium">Aligned</span>
          </button>

          <button
            onClick={() => handleSubmit('UNSURE')}
            disabled={submitting}
            className={`
              flex-1 px-4 py-3 rounded-lg border transition
              ${selectedFeedback === 'UNSURE'
                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'
              }
              ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="text-lg mb-1 block">🤔</span>
            <span className="text-sm font-medium">Unsure</span>
          </button>

          <button
            onClick={() => handleSubmit('MISMATCH')}
            disabled={submitting}
            className={`
              flex-1 px-4 py-3 rounded-lg border transition
              ${selectedFeedback === 'MISMATCH'
                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'
              }
              ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="text-lg mb-1 block">👎</span>
            <span className="text-sm font-medium">Didn't match</span>
          </button>
        </div>

        {/* Transparency Text */}
        <p className="text-xs text-gray-500 text-center">
          Feedback helps improve pattern recognition over time.
        </p>
      </div>

      {/* Optional Note (Collapsed by default) */}
      {selectedFeedback && !submitted && (
        <div className="space-y-3 border-t border-gray-800 pt-4">
          {!showNote ? (
            <button
              onClick={() => setShowNote(true)}
              className="text-xs text-gray-400 hover:text-gray-300 underline"
            >
              Add a private note
            </button>
          ) : (
            <>
              <label className="block text-xs text-gray-400">
                Add a private note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any additional context..."
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500/50 resize-none"
                rows={3}
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowNote(false);
                    setNote('');
                  }}
                  className="text-xs text-gray-400 hover:text-gray-300 underline"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmit(selectedFeedback)}
                  disabled={submitting}
                  className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-sm font-medium hover:bg-green-500/30 transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
              <span className="text-xs text-gray-600 block text-right">{note.length}/500</span>
            </>
          )}
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
