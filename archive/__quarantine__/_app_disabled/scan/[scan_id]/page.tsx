'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ImagePreview from '@/components/ImagePreview';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import MatchReasoning from '@/components/MatchReasoning';
import AIReportPanel from '@/components/scan/AIReportPanel';
import { supabase } from "@/lib/supabaseClient";
import { useMembership } from '@/lib/membership/useMembership';
import ScanConfirmation from '@/components/scan/ScanConfirmation';
import VisualSimilarityPanel from '@/components/scan/VisualSimilarityPanel';

interface ScanData {
  id: string;
  image_url: string;
  status: string;
  scan_type?: 'id' | 'doctor';
  grow_id?: string | null;
  payload?: Record<string, any>;
  vision_results?: any;
  match_result?: {
    match: {
      name: string;
      slug: string;
      confidence: number;
      reasoning: string;
      reasons?: string[]; // Internal reason codes for UI
      breakdown?: {
        color: number;
        text: number;
        label: number;
        web: number;
      };
    };
    alternatives: Array<{
      name: string;
      slug: string;
      confidence: number;
      reasoning: string;
      reasons?: string[]; // Internal reason codes for UI
    }>;
  };
  created_at: string;
}

type GrowDoctorInsight = {
  title?: string;
  summary?: string;
  confidence?: string;
  relation?: 'new' | 'consistent' | 'improving';
  status?: string | null;
};

export default function ScanResultPage() {
  if (typeof window === 'undefined') {
    return null;
  }
  const params = useParams();
  const router = useRouter();
  const scanId = params.scan_id as string;
  const { isMember } = useMembership();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanData | null>(null);
  const [doctorInsight, setDoctorInsight] = useState<GrowDoctorInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [scannedRecently, setScannedRecently] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [labelValue, setLabelValue] = useState('');
  const [labelSaving, setLabelSaving] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linking, setLinking] = useState(false);
  const [growOptions, setGrowOptions] = useState<any[]>([]);
  
  if (!scan && !loading) {
    return <div className="text-white p-6">Preparing scan…</div>;
  }

  useEffect(() => {
    async function loadScan() {
      
      if (!scanId) {
        setError('No scan ID provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/scans/${scanId}`);
        if (!response.ok) {
          const text = await response.text();
          const errorData = text ? JSON.parse(text) : null;
          if (response.status === 401 || response.status === 403) {
            router.push('/login');
            return;
          }
          throw new Error(errorData?.error || 'Failed to load scan');
        }

        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        const scanData = data.scan;
        
        // Support both new and legacy field names
        const matchData = scanData.match || scanData.match_result;
        const visionData = scanData.vision || scanData.vision_results;
        if (scanData.label) setLabelValue(scanData.label);
        
        // If scan doesn't have match yet but has vision, try to match
        if (!matchData && visionData) {
          try {
            const matchResponse = await fetch('/api/visual-match', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ scan_id: scanId }),
            });
            
            if (matchResponse.ok) {
              const text = await matchResponse.text();
              const matchResult = text ? JSON.parse(text) : null;
              scanData.match = {
                match: matchResult?.match,
                alternatives: matchResult?.alternatives || [],
              };
            }
          } catch (matchErr) {
            console.warn('Could not fetch match result:', matchErr);
          }
        }
        
        setScan(scanData);
      } catch (err: any) {
        console.error('Error loading scan:', err);
        setError(err.message || 'Failed to load scan result');
      } finally {
        setLoading(false);
      }
    }

    loadScan();
  }, [scanId, router]);

  const growId = scan
    ? (scan as any).grow_id || (scan as any)?.payload?.grow_id || null
    : null;

  useEffect(() => {
    if (!growId) {
      setDoctorInsight(null);
      return;
    }

    const resolvedTier = ((scan as any)?.membership_tier ||
      (isMember ? 'garden' : 'free')) as 'free' | 'garden' | 'pro';

    let aborted = false;
    setInsightLoading(true);
    setDoctorInsight(null);

    const fetchInsight = async () => {
      try {
        const res = await fetch(`/api/grow-doctor/insight?growId=${growId}&tier=${resolvedTier}`);
        if (!res.ok) return;
        const data = await res.json();
        if (aborted) return;
        if (data?.diagnosis) {
          setDoctorInsight(data.diagnosis);
        }
      } catch (err) {
        console.warn('[GrowDoctor] insight fetch failed', err);
      } finally {
        if (!aborted) {
          setInsightLoading(false);
        }
      }
    };

    fetchInsight();
    return () => {
      aborted = true;
    };
  }, [growId, isMember, scan]);

  useEffect(() => {
    if (!growId) {
      setScannedRecently(false);
      return;
    }
    const key = `scan:last:${growId}`;
    const last = localStorage.getItem(key);
    if (last) {
      const deltaHours = (Date.now() - Number(last)) / (1000 * 60 * 60);
      setScannedRecently(deltaHours < 12);
    }
  }, [growId]);

  useEffect(() => {
    if (!linkOpen) return;
    const fetchGrows = async () => {
      try {
        const res = await fetch('/api/garden/grows');
        if (!res.ok) return;
        const data = await res.json();
        setGrowOptions(data || []);
      } catch (err) {
        console.warn('[scan] grow fetch failed', err);
      }
    };
    fetchGrows();
  }, [linkOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading scan result...</p>
        </div>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="min-h-screen bg-[var(--botanical-bg-deep)] text-white p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-900/40 border border-red-500/40 rounded-lg p-4 mb-4">
            <p className="text-red-200">{error || 'Scan result not found'}</p>
          </div>
          <Link
            href="/scanner"
            className="inline-block py-2 px-4 bg-[var(--botanical-accent)] text-black rounded-lg hover:opacity-90 transition"
          >
            Try Another Scan
          </Link>
        </div>
      </div>
    );
  }

  // Support both new and legacy field names
  const matchData = (scan as any).match || (scan as any).match_result;
  const match = matchData?.match || null;
  const alternatives = matchData?.alternatives || [];
  
  // Get enrichment data (graceful fallback if missing)
  const enrichment = (scan as any).enrichment || matchData?.enrichment || null;

  const relationCopy: Record<NonNullable<GrowDoctorInsight["relation"]>, string> = {
    new: "New issue detected since your last check",
    consistent: "Consistent with your recent scans",
    improving: "Showing signs of improvement",
  };

  return (
    <div className="min-h-screen bg-[var(--botanical-bg-deep)] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link
                href="/scanner"
                className="text-green-400 hover:text-green-300 mb-2 inline-block"
              >
                ← Back to Scanner
              </Link>
              <h1 className="text-3xl font-bold">Scan Result</h1>
            </div>
            <Link
              href={`/garden/chat?scan_id=${scanId}${growId ? `&grow_id=${growId}` : ''}`}
              className="text-emerald-300 text-sm hover:text-emerald-200 underline underline-offset-4"
            >
              Garden Chat
            </Link>
          </div>
        </div>

        {/* Grow Doctor Insight */}
        {!doctorInsight && growId && insightLoading && (
          <div className="mb-6">
            <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-4 flex items-center gap-2 text-sm text-[var(--botanical-text-secondary)]">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              Checking Grow Doctor memory...
            </div>
          </div>
        )}
        {doctorInsight && (
          <div className="mb-6">
            <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-emerald-300/80">Grow Doctor Insight</p>
                <p className="text-sm text-[var(--botanical-text-primary)]">
                  {doctorInsight.title || doctorInsight.summary || 'Recent cultivation patterns reviewed.'}
                </p>
                {doctorInsight.relation && (
                  <p className="text-xs text-[var(--botanical-text-secondary)]">
                    {relationCopy[doctorInsight.relation] ?? `Relation: ${doctorInsight.relation}`}
                  </p>
                )}
              </div>
              {doctorInsight.confidence && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-200">
                  {doctorInsight.confidence} confidence
                </span>
              )}
            </div>
          </div>
        )}
        {!doctorInsight && !insightLoading && (
          <div className="mb-6">
            <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-4 text-sm text-[var(--botanical-text-secondary)]">
              Insight will appear when available.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Image */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Uploaded Image</h2>
            <div className="relative w-full aspect-square rounded-lg overflow-hidden">
              <ImagePreview src={scan.image_url} alt="Scanned image" className="w-full h-full" />
            </div>
              <div className="mt-4">
                <ScanConfirmation
                  growName={(scan as any)?.grow_name || undefined}
                  diagnosisSummary={doctorInsight?.summary || doctorInsight?.title || undefined}
                  confidenceLabel={doctorInsight?.confidence || undefined}
                  scannedRecently={scannedRecently}
                  seed={scanId}
                />

                <div className="mt-4">
                  <VisualSimilarityPanel
                    scanId={scanId}
                    confidence="observational"
                    growContext={
                      doctorInsight?.summary
                        ? [`Recent insight: ${doctorInsight.summary}`, doctorInsight.confidence ? `Confidence noted as ${doctorInsight.confidence}.` : undefined].filter(Boolean) as string[]
                        : undefined
                    }
                  />
                </div>

                {!growId && (
                  <div className="mt-3 bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-white/80">Save this scan to a grow</p>
                      <button
                        onClick={() => setLinkOpen((s) => !s)}
                        className="text-xs text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
                      >
                        {linkOpen ? 'Hide' : 'Choose grow'}
                      </button>
                    </div>
                    {linkOpen && (
                      <div className="space-y-2">
                        {growOptions.length === 0 && (
                          <p className="text-xs text-white/60">Load your grows to link this scan.</p>
                        )}
                        {growOptions.map((g) => (
                          <button
                            key={g.id}
                            onClick={async () => {
                              setLinking(true);
                              try {
                                const res = await fetch(`/api/scans/${scanId}/link`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ grow_id: g.id }),
                                });
                                if (!res.ok) throw new Error('Failed to save');
                                setScan((prev: any) => ({ ...(prev || {}), grow_id: g.id, grow_name: g.strain_name || g.name }));
                                setLinkOpen(false);
                              } catch (err) {
                                console.warn('[scan] link failed', err);
                              } finally {
                                setLinking(false);
                              }
                            }}
                            disabled={linking}
                            className="w-full text-left px-3 py-2 rounded-md bg-white/10 border border-white/15 text-sm text-white hover:bg-white/15"
                          >
                            {g.strain_name || g.name || 'Unnamed grow'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

            <div className="mt-3 bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-white/80">Add a label (optional)</p>
                <button
                  onClick={() => setLabelOpen((s) => !s)}
                  className="text-xs text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
                >
                  {labelOpen ? 'Hide' : 'Edit'}
                </button>
              </div>
              {labelOpen && (
                <div className="space-y-2">
                  <input
                    value={labelValue}
                    onChange={(e) => setLabelValue(e.target.value)}
                    placeholder="Use any name that helps you recognize this plant."
                    className="w-full rounded-md bg-black/40 border border-white/15 px-3 py-2 text-sm text-white"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={async () => {
                        setLabelSaving(true);
                        try {
                          const res = await fetch(`/api/scans/${scanId}/label`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ label: labelValue }),
                          });
                          if (!res.ok) {
                            const data = await res.json().catch(() => ({}));
                            throw new Error(data.error || 'Failed to save label');
                          }
                          setLabelOpen(false);
                        } catch (err) {
                          console.warn('[label] save failed', err);
                        } finally {
                          setLabelSaving(false);
                        }
                      }}
                      disabled={labelSaving}
                      className="px-3 py-1 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 disabled:opacity-60"
                    >
                      {labelSaving ? 'Saving...' : 'Save label'}
                    </button>
                  </div>
                </div>
              )}
            </div>
              </div>
          </div>

          {/* Right Column: Match Details */}
          <div className="space-y-6">
            {/* Best Match */}
            {match ? (
              <div>
                <h2 className="text-xl font-semibold mb-3">Best Match</h2>
                <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-4 space-y-4">
                  {/* Proxy Image if available */}
                  {match.public_image && (
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden">
                      <img
                        src={`/api/vault/images/${match.slug}`}
                        alt={match.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <h3 className="text-2xl font-bold text-[var(--botanical-accent-alt)]">{match.name}</h3>
                    <p className="text-sm text-[var(--botanical-text-secondary)]">Slug: {match.slug}</p>
                  </div>

                  <ConfidenceBadge confidence={match.confidence} size="lg" showLabel={true} />

                  <MatchReasoning 
                    reasoning={match.reasoning} 
                    breakdown={match.breakdown}
                    reasons={(match as any).reasons}
                  />
                  
                  {/* Enrichment explanation if available */}
                  {enrichment?.explanation && (
                    <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <p className="text-sm text-emerald-300">{enrichment.explanation}</p>
                      {enrichment.recommendations && enrichment.recommendations.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-emerald-400/80 font-semibold mb-1">Recommendations:</p>
                          <ul className="text-xs text-emerald-300/70 space-y-1">
                            {enrichment.recommendations.slice(0, 3).map((rec: string, idx: number) => (
                              <li key={idx}>• {rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold mb-3 text-[var(--botanical-accent-alt)]">Strain Unknown</h2>
                <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-4 space-y-3">
                  <p className="text-[var(--botanical-text-primary)]">
                    We couldn't identify this strain with confidence. Here are some suggestions:
                  </p>
                  <ul className="list-disc list-inside text-[var(--botanical-text-secondary)] space-y-1 text-sm">
                    <li>Try rescanning with better lighting</li>
                    <li>Include any label text visible in the image</li>
                    <li>Make sure the cannabis is clearly visible</li>
                    <li>Check that the image is in focus</li>
                  </ul>
                  
                  {/* Show enrichment recommendations even if no match */}
                  {enrichment?.recommendations && enrichment.recommendations.length > 0 && (
                    <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <p className="text-xs text-emerald-400/80 font-semibold mb-1">Recommendations:</p>
                      <ul className="text-xs text-emerald-300/70 space-y-1">
                        {enrichment.recommendations.map((rec: string, idx: number) => (
                          <li key={idx}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Doctor Scan Enrichment (shown even without match) */}
            {scan.scan_type === 'doctor' && enrichment && (
              <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-4 space-y-3">
                <h2 className="text-xl font-semibold mb-3">Health Analysis</h2>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-sm text-amber-300">{enrichment.explanation}</p>
                </div>
                
                {enrichment.observed_signals && enrichment.observed_signals.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-[var(--botanical-text-primary)] mb-2">Observed Signals:</p>
                    <ul className="text-sm text-[var(--botanical-text-secondary)] space-y-1">
                      {enrichment.observed_signals.map((signal: string, idx: number) => (
                        <li key={idx}>• {signal}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {enrichment.probable_conditions && enrichment.probable_conditions.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-[var(--botanical-text-primary)] mb-2">Probable Conditions:</p>
                    <ul className="text-sm text-[var(--botanical-text-secondary)] space-y-1">
                      {enrichment.probable_conditions.map((condition: string, idx: number) => (
                        <li key={idx}>• {condition}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {enrichment.recommendations && enrichment.recommendations.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-emerald-400 mb-2">Recommendations:</p>
                    <ul className="text-sm text-emerald-300/80 space-y-1">
                      {enrichment.recommendations.map((rec: string, idx: number) => (
                        <li key={idx}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {enrichment.follow_up_checks && enrichment.follow_up_checks.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-[var(--botanical-text-primary)] mb-2">Follow-up Checks:</p>
                    <ul className="text-sm text-[var(--botanical-text-secondary)] space-y-1">
                      {enrichment.follow_up_checks.map((check: string, idx: number) => (
                        <li key={idx}>• {check}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Alternative Matches */}
            {alternatives.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-3">Alternative Matches</h2>
                <div className="space-y-2">
                  {alternatives.map((alt: any, idx: number) => (
                    <Link
                      key={idx}
                      href={`/strain/${alt.slug}`}
                      className="block bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-3 hover:border-[var(--botanical-accent)]/40 transition"
                    >
                      <div className="flex gap-3 items-center">
                        {/* Proxy Image if available */}
                        {alt.public_image && (
                          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={`/api/vault/images/${alt.slug}`}
                              alt={alt.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <div className="flex-1 flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold text-[var(--botanical-accent)]">{alt.name}</h4>
                            <p className="text-xs text-[var(--botanical-text-secondary)]">{alt.reasoning}</p>
                          </div>
                          <div className="text-right">
                            <ConfidenceBadge 
                              confidence={alt.confidence} 
                              size="sm" 
                              showPercentage={true}
                              showLabel={true}
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* AI Analysis Section */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Detailed Analysis</h2>
          <AIReportPanel scanId={scanId} />
        </div>

        {/* Scanner → Logbook Conversion CTA */}
        {match && (
          <div className="mt-6 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
            {isMember ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-emerald-400 font-semibold mb-1">
                    💾 Save this scan as a Grow Log entry
                  </p>
                  <p className="text-sm text-gray-400">
                    Track this strain in your grow and get Coach guidance
                  </p>
                </div>
                <Link
                  href="/garden/logbook"
                  className="px-6 py-2 bg-emerald-600 text-black rounded-lg font-semibold hover:opacity-90 transition whitespace-nowrap"
                >
                  Open Logbook →
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-emerald-400 font-semibold mb-1">
                    🌱 Members can save scans, track grows, and get Grow Coach guidance
                  </p>
                  <p className="text-sm text-gray-400">
                    Unlock the Garden to start your grow logbook today
                  </p>
                </div>
                <Link
                  href="/garden/paywall"
                  className="px-6 py-2 bg-emerald-600 text-black rounded-lg font-semibold hover:opacity-90 transition whitespace-nowrap"
                >
                  Unlock the Garden →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          <Link
            href="/scanner"
            className="px-6 py-3 bg-[var(--botanical-accent)] text-black rounded-lg font-semibold hover:opacity-90 transition"
          >
            Try Another Scan
          </Link>
          <Link
            href="/gallery"
            className="px-6 py-3 bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] text-[var(--botanical-text-primary)] rounded-lg font-semibold hover:border-[var(--botanical-accent)]/40 transition"
          >
            View Gallery
          </Link>
        </div>
      </div>
    </div>
  );
}

