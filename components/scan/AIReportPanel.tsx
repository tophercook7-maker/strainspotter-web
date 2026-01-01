'use client';

import { useEffect, useState } from 'react';

interface ScanReport {
  summary: {
    overall_assessment: string;
    confidence_level: 'low' | 'moderate' | 'high';
  };
  visual_analysis: {
    appearance: string;
    trichome_observations: string;
    coloration: string;
    structure: string;
  };
  phenotype_context: {
    similar_profiles: string;
    common_traits: string;
    notable_deviations: string;
  };
  strain_cross_reference: {
    related_families: string[];
    explanation: string;
  };
  handling_and_cure_notes: {
    observations: string;
    confidence: string;
  };
  packaging_review?: {
    label_summary: string;
    visual_consistency: string;
    confidence: string;
    notes: string;
  };
  disclaimer: string;
}

interface ReportData {
  report_json: ScanReport;
  confidence_score: number;
  generated_at: string;
}

interface AIReportPanelProps {
  scanId: string;
}

export default function AIReportPanel({ scanId }: AIReportPanelProps) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [showFeedbackThankYou, setShowFeedbackThankYou] = useState(false);

  useEffect(() => {
    async function fetchReport() {
      try {
        const response = await fetch(`/api/reports/${scanId}`);
        
        if (response.status === 404) {
          // Report not found - this is expected for scans without reports
          setReport(null);
          setError(null);
          setLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch report');
        }

        const data = await response.json();
        setReport(data);
        setError(null);
      } catch (err) {
        console.warn('[AIReportPanel] Error fetching report:', err);
        setError('Failed to load analysis');
      } finally {
        setLoading(false);
      }
    }

    if (scanId) {
      fetchReport();
    }
  }, [scanId]);

  if (loading) {
    return (
      <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--botanical-text-secondary)]">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-4">
        <div className="text-center py-4">
          <p className="text-sm text-[var(--botanical-text-secondary)]">
            Detailed analysis unavailable for this scan.
          </p>
        </div>
      </div>
    );
  }

  const reportData = report.report_json;
  const confidenceLevel = reportData.summary.confidence_level;
  const confidenceColor = 
    confidenceLevel === 'high' ? 'text-emerald-400' :
    confidenceLevel === 'moderate' ? 'text-amber-400' :
    'text-gray-400';

  return (
    <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-[var(--botanical-border)] pb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">AI Analysis</h2>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${confidenceColor}`}>
              {confidenceLevel.toUpperCase()} CONFIDENCE
            </span>
            <span className="text-xs text-[var(--botanical-text-secondary)]">
              ({Math.round(report.confidence_score * 100)}%)
            </span>
          </div>
        </div>
        <p className="text-xs text-[var(--botanical-text-secondary)] italic">
          Observational analysis only. Not a definitive identification.
        </p>
      </div>

      {/* Summary */}
      <section>
        <h3 className="text-lg font-semibold mb-2 text-[var(--botanical-accent-alt)]">Summary</h3>
        <p className="text-sm text-[var(--botanical-text-primary)] leading-relaxed">
          {reportData.summary.overall_assessment}
        </p>
      </section>

      {/* Visual Analysis */}
      <section>
        <h3 className="text-lg font-semibold mb-3 text-[var(--botanical-accent-alt)]">Visual Analysis</h3>
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-[var(--botanical-text-primary)] mb-1">Appearance</h4>
            <p className="text-sm text-[var(--botanical-text-secondary)] leading-relaxed">
              {reportData.visual_analysis.appearance}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--botanical-text-primary)] mb-1">Trichome Observations</h4>
            <p className="text-sm text-[var(--botanical-text-secondary)] leading-relaxed">
              {reportData.visual_analysis.trichome_observations}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--botanical-text-primary)] mb-1">Coloration</h4>
            <p className="text-sm text-[var(--botanical-text-secondary)] leading-relaxed">
              {reportData.visual_analysis.coloration}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--botanical-text-primary)] mb-1">Structure</h4>
            <p className="text-sm text-[var(--botanical-text-secondary)] leading-relaxed">
              {reportData.visual_analysis.structure}
            </p>
          </div>
        </div>
      </section>

      {/* Phenotype Context */}
      <section>
        <h3 className="text-lg font-semibold mb-3 text-[var(--botanical-accent-alt)]">Phenotype Context</h3>
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-[var(--botanical-text-primary)] mb-1">Similar Profiles</h4>
            <p className="text-sm text-[var(--botanical-text-secondary)] leading-relaxed">
              {reportData.phenotype_context.similar_profiles}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--botanical-text-primary)] mb-1">Common Traits</h4>
            <p className="text-sm text-[var(--botanical-text-secondary)] leading-relaxed">
              {reportData.phenotype_context.common_traits}
            </p>
          </div>
          {reportData.phenotype_context.notable_deviations && (
            <div>
              <h4 className="text-sm font-semibold text-[var(--botanical-text-primary)] mb-1">Notable Deviations</h4>
              <p className="text-sm text-[var(--botanical-text-secondary)] leading-relaxed">
                {reportData.phenotype_context.notable_deviations}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Strain Cross-Reference */}
      {reportData.strain_cross_reference.related_families.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3 text-[var(--botanical-accent-alt)]">Strain Cross-Reference</h3>
          <div className="mb-2">
            <p className="text-sm text-[var(--botanical-text-secondary)] leading-relaxed mb-2">
              {reportData.strain_cross_reference.explanation}
            </p>
            <div className="flex flex-wrap gap-2">
              {reportData.strain_cross_reference.related_families.map((family, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-300"
                >
                  {family}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Handling & Cure Notes */}
      <section>
        <h3 className="text-lg font-semibold mb-3 text-[var(--botanical-accent-alt)]">Handling & Cure Notes</h3>
        <div className="space-y-2">
          <p className="text-sm text-[var(--botanical-text-secondary)] leading-relaxed">
            {reportData.handling_and_cure_notes.observations}
          </p>
          <p className="text-xs text-[var(--botanical-text-secondary)] italic">
            Confidence: {reportData.handling_and_cure_notes.confidence}
          </p>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="pt-4 border-t border-[var(--botanical-border)]">
        <p className="text-xs text-[var(--botanical-text-secondary)] leading-relaxed italic">
          {reportData.disclaimer}
        </p>
        {report.generated_at && (
          <p className="text-xs text-[var(--botanical-text-secondary)] mt-2 opacity-60">
            Generated: {new Date(report.generated_at).toLocaleString()}
          </p>
        )}
      </section>

      {/* Feedback Section */}
      {!feedbackSubmitted && (
        <section className="pt-6 border-t border-[var(--botanical-border)] mt-6">
          <h3 className="text-sm font-semibold mb-3 text-[var(--botanical-text-primary)]">
            Was this analysis helpful?
          </h3>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => handleFeedback('agree')}
              disabled={feedbackLoading}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-lg text-sm text-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              👍 Agree
            </button>
            <button
              onClick={() => handleFeedback('unsure')}
              disabled={feedbackLoading}
              className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 rounded-lg text-sm text-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              🤔 Unsure
            </button>
            <button
              onClick={() => handleFeedback('disagree')}
              disabled={feedbackLoading}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-sm text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              👎 Disagree
            </button>
          </div>
          <textarea
            value={feedbackNote}
            onChange={(e) => setFeedbackNote(e.target.value)}
            placeholder="Optional note (private)"
            disabled={feedbackLoading}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            rows={2}
          />
        </section>
      )}

      {showFeedbackThankYou && (
        <section className="pt-4 border-t border-[var(--botanical-border)] mt-4">
          <p className="text-sm text-emerald-400 italic">
            Thank you for your feedback!
          </p>
        </section>
      )}
    </div>
  );

  async function handleFeedback(feedbackType: 'agree' | 'unsure' | 'disagree') {
    setFeedbackLoading(true);
    try {
      const response = await fetch(`/api/scan/${scanId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback_type: feedbackType,
          feedback_context: feedbackNote.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit feedback');
      }

      setFeedbackSubmitted(true);
      setShowFeedbackThankYou(true);
      
      // Hide thank you message after 5 seconds
      setTimeout(() => {
        setShowFeedbackThankYou(false);
      }, 5000);
    } catch (err: unknown) {
      console.error('[AIReportPanel] Feedback submission error:', err);
      // Silently fail - don't disrupt user experience
    } finally {
      setFeedbackLoading(false);
    }
  }
}

