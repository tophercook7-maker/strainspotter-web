"use client";

import { useEffect, useState } from "react";

interface VaultStatus {
  vault: {
    strainsDir: boolean;
    datasetsDir: boolean;
    strainCount: number;
    timestamp: string;
  };
  scraper: {
    total: number;
    complete: number;
    pending: number;
  };
  generator: {
    generated: number;
    missing: number;
  };
}

interface CompletenessItem {
  slug: string;
  score: number;
  rawCount: number;
  genCount: number;
  hasManifest: boolean;
  hasEmbedding: boolean;
  hasCluster: boolean;
  hasPublicImage: boolean;
  ocrStatus?: string;
  ocrConfidence?: number;
  lastUpdated: string | null;
}

interface CompletenessData {
  total: number;
  items: CompletenessItem[];
}

interface CompletenessStats {
  total: number;
  withRaw: number;
  withGenerated: number;
  withEmbedding: number;
  avgScore: number;
}

export default function VaultControlPanel() {
  const [data, setData] = useState<VaultStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [completeness, setCompleteness] = useState<CompletenessData | null>(null);
  const [completenessStats, setCompletenessStats] = useState<CompletenessStats | null>(null);
  const [flags, setFlags] = useState<string[]>([]);
  const [selectedFlag, setSelectedFlag] = useState<any>(null);
  const [loadingCompleteness, setLoadingCompleteness] = useState(false);
  const [manifestStats, setManifestStats] = useState<any>(null);

  const fetchStatus = async () => {
    try {
      setRefreshing(true);
      const response = await fetch("/api/admin/vault/status");
      
      if (!response.ok) {
        if (response.status === 403) {
          setError("Admin access required");
          return;
        }
        throw new Error(`Failed to fetch status: ${response.statusText}`);
      }

      const statusData = await response.json();
      setData(statusData);
      setError(null);
    } catch (err: any) {
      console.error("[vault/control] Error fetching status:", err);
      setError(err.message || "Failed to load Vault status");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCompleteness = async () => {
    try {
      setLoadingCompleteness(true);
      const [dataRes, statsRes] = await Promise.all([
        fetch("/api/admin/vault/completeness?limit=100"),
        fetch("/api/admin/vault/completeness?stats=true"),
      ]);

      if (dataRes.ok) {
        const data = await dataRes.json();
        setCompleteness(data);
      }

      if (statsRes.ok) {
        const stats = await statsRes.json();
        setCompletenessStats(stats.stats);
      }
    } catch (err: any) {
      console.error("[vault/control] Error fetching completeness:", err);
    } finally {
      setLoadingCompleteness(false);
    }
  };

  const fetchFlags = async () => {
    try {
      const response = await fetch("/api/admin/vault/flags");
      if (response.ok) {
        const data = await response.json();
        setFlags(data.flags || []);
      }
    } catch (err: any) {
      console.error("[vault/control] Error fetching flags:", err);
    }
  };

  const fetchManifestStats = async () => {
    try {
      const response = await fetch("/api/admin/vault/manifests/stats");
      if (response.ok) {
        const data = await response.json();
        setManifestStats(data.stats);
      }
    } catch (err: any) {
      console.error("[vault/control] Error fetching manifest stats:", err);
    }
  };

  const fetchFlagDetails = async (name: string) => {
    try {
      const response = await fetch(`/api/admin/vault/flags?name=${name}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedFlag(data.flag);
      }
    } catch (err: any) {
      console.error("[vault/control] Error fetching flag details:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchCompleteness();
    fetchFlags();
    fetchManifestStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStatus();
      fetchCompleteness();
      fetchFlags();
      fetchManifestStats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleResumeScraper = async () => {
    try {
      const response = await fetch("/api/admin/vault/scraper/resume", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to send scraper resume signal");
      }

      const result = await response.json();
      alert(`✅ ${result.message}`);
      
      // Refresh status after a short delay
      setTimeout(fetchStatus, 2000);
    } catch (err: any) {
      console.error("[vault/control] Error resuming scraper:", err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  const handleResumeGenerator = async () => {
    try {
      const response = await fetch("/api/admin/vault/generator/resume", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to send generator resume signal");
      }

      const result = await response.json();
      alert(`✅ ${result.message}${result.embeddingsQueued ? " (Embeddings refresh also queued)" : ""}`);
      
      // Refresh status after a short delay
      setTimeout(() => {
        fetchStatus();
        fetchFlags();
      }, 2000);
    } catch (err: any) {
      console.error("[vault/control] Error resuming generator:", err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  const handleRefreshEmbeddings = async () => {
    try {
      const response = await fetch("/api/admin/vault/embeddings/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "all" }),
      });

      if (!response.ok) {
        throw new Error("Failed to queue embeddings refresh");
      }

      const result = await response.json();
      alert(`✅ ${result.message}`);
      
      // Refresh flags to show new flag
      setTimeout(fetchFlags, 1000);
    } catch (err: any) {
      console.error("[vault/control] Error refreshing embeddings:", err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  const handleBuildManifests = async (limit?: number) => {
    if (!confirm(`Build manifests${limit ? ` (first ${limit} strains)` : " (all strains)"}? This is safe and idempotent.`)) {
      return;
    }

    try {
      setRefreshing(true);
      const response = await fetch("/api/admin/vault/manifests/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit }),
      });

      if (!response.ok) {
        throw new Error("Failed to build manifests");
      }

      const result = await response.json();
      alert(`✅ ${result.message}\n\nCreated: ${result.result.created}\nSkipped: ${result.result.skipped}\nErrors: ${result.result.errors}`);
      
      // Refresh completeness data and manifest stats
      setTimeout(() => {
        fetchCompleteness();
        fetchStatus();
        fetchManifestStats();
      }, 2000);
    } catch (err: any) {
      console.error("[vault/control] Error building manifests:", err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRunProxyOCR = async (limit?: number, ocrOnly?: boolean) => {
    const action = ocrOnly ? "Re-run OCR" : "Run proxy image + OCR pipeline";
    if (!confirm(`${action}${limit ? ` (first ${limit} strains)` : " (all strains)"}? This is safe and idempotent.`)) {
      return;
    }

    try {
      setRefreshing(true);
      const response = await fetch("/api/admin/vault/proxy-ocr/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit, ocrOnly }),
      });

      if (!response.ok) {
        throw new Error("Failed to run proxy-OCR pipeline");
      }

      const result = await response.json();
      alert(`✅ ${result.message}\n\nProcessed: ${result.processed}\nSucceeded: ${result.succeeded}\nFailed: ${result.failed}`);
      
      // Refresh completeness data and manifest stats
      setTimeout(() => {
        fetchCompleteness();
        fetchStatus();
        fetchManifestStats();
      }, 2000);
    } catch (err: any) {
      console.error("[vault/control] Error running proxy-OCR:", err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--botanical-bg-deep)] text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[var(--botanical-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading Vault status...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-[var(--botanical-bg-deep)] text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-900/40 border border-red-500/40 rounded-lg p-4">
            <p className="text-red-200">{error}</p>
            <button
              onClick={() => window.location.href = "/login"}
              className="mt-4 px-4 py-2 bg-[var(--botanical-accent)] text-black rounded hover:opacity-90"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--botanical-bg-deep)] text-white p-8">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--botanical-bg-deep)] text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-[var(--botanical-accent-alt)]">
            Vault Control Panel
          </h1>
          <p className="text-[var(--botanical-text-secondary)]">
            Monitor and control the Vault-based scraper + generator pipeline
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Vault Health */}
          <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-[var(--botanical-accent)]">
              Vault Health
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--botanical-text-secondary)]">Strains Dir:</span>
                <span className={data.vault.strainsDir ? "text-[var(--botanical-accent)]" : "text-red-400"}>
                  {data.vault.strainsDir ? "✅" : "❌"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--botanical-text-secondary)]">Datasets Dir:</span>
                <span className={data.vault.datasetsDir ? "text-[var(--botanical-accent)]" : "text-red-400"}>
                  {data.vault.datasetsDir ? "✅" : "❌"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--botanical-text-secondary)]">Strain Count:</span>
                <span className="text-[var(--botanical-text-primary)] font-semibold">
                  {data.vault.strainCount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Scraper Status */}
          <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-[var(--botanical-accent)]">
              Scraper Status
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--botanical-text-secondary)]">Total:</span>
                <span className="text-[var(--botanical-text-primary)] font-semibold">
                  {data.scraper.total.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--botanical-text-secondary)]">Complete:</span>
                <span className="text-[var(--botanical-accent)] font-semibold">
                  {data.scraper.complete.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--botanical-text-secondary)]">Pending:</span>
                <span className="text-amber-400 font-semibold">
                  {data.scraper.pending.toLocaleString()}
                </span>
              </div>
              {data.scraper.total > 0 && (
                <div className="mt-3">
                  <div className="w-full bg-[var(--botanical-bg-deep)] rounded-full h-2">
                    <div
                      className="bg-[var(--botanical-accent)] h-2 rounded-full transition-all"
                      style={{
                        width: `${(data.scraper.complete / data.scraper.total) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-[var(--botanical-text-secondary)] mt-1">
                    {Math.round((data.scraper.complete / data.scraper.total) * 100)}% complete
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Generator Status */}
          <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-[var(--botanical-accent)]">
              Generator Status
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--botanical-text-secondary)]">Generated:</span>
                <span className="text-[var(--botanical-accent)] font-semibold">
                  {data.generator.generated.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--botanical-text-secondary)]">Missing:</span>
                <span className="text-amber-400 font-semibold">
                  {data.generator.missing.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Manifest Stats */}
        {manifestStats && (
          <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold mb-3 text-[var(--botanical-accent)]">
              Manifest Status
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-[var(--botanical-text-secondary)]">Total Strains</div>
                <div className="text-xl font-bold text-[var(--botanical-text-primary)]">
                  {manifestStats.total.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[var(--botanical-text-secondary)]">With Manifests</div>
                <div className="text-xl font-bold text-[var(--botanical-accent)]">
                  {manifestStats.withManifest.toLocaleString()}
                </div>
                <div className="text-xs text-[var(--botanical-text-secondary)]">
                  {manifestStats.total > 0 ? Math.round((manifestStats.withManifest / manifestStats.total) * 100) : 0}%
                </div>
              </div>
              <div>
                <div className="text-[var(--botanical-text-secondary)]">Without Manifests</div>
                <div className="text-xl font-bold text-amber-400">
                  {manifestStats.withoutManifest.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[var(--botanical-text-secondary)]">With Images</div>
                <div className="text-xl font-bold text-[var(--botanical-accent)]">
                  {manifestStats.withImages.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Completeness KPIs */}
        {completenessStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-4">
              <div className="text-sm text-[var(--botanical-text-secondary)] mb-1">Total Strains</div>
              <div className="text-2xl font-bold text-[var(--botanical-text-primary)]">
                {completenessStats.total.toLocaleString()}
              </div>
            </div>
            <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-4">
              <div className="text-sm text-[var(--botanical-text-secondary)] mb-1">With Raw Data</div>
              <div className="text-2xl font-bold text-[var(--botanical-accent)]">
                {completenessStats.withRaw.toLocaleString()}
              </div>
              <div className="text-xs text-[var(--botanical-text-secondary)] mt-1">
                {completenessStats.total > 0 ? Math.round((completenessStats.withRaw / completenessStats.total) * 100) : 0}%
              </div>
            </div>
            <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-4">
              <div className="text-sm text-[var(--botanical-text-secondary)] mb-1">With Generated</div>
              <div className="text-2xl font-bold text-[var(--botanical-accent)]">
                {completenessStats.withGenerated.toLocaleString()}
              </div>
              <div className="text-xs text-[var(--botanical-text-secondary)] mt-1">
                {completenessStats.total > 0 ? Math.round((completenessStats.withGenerated / completenessStats.total) * 100) : 0}%
              </div>
            </div>
            <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-4">
              <div className="text-sm text-[var(--botanical-text-secondary)] mb-1">With Embeddings</div>
              <div className="text-2xl font-bold text-[var(--botanical-accent)]">
                {completenessStats.withEmbedding.toLocaleString()}
              </div>
              <div className="text-xs text-[var(--botanical-text-secondary)] mt-1">
                {completenessStats.total > 0 ? Math.round((completenessStats.withEmbedding / completenessStats.total) * 100) : 0}%
              </div>
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-[var(--botanical-accent)]">
            Pipeline Controls
          </h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleResumeScraper}
              disabled={refreshing}
              className="px-6 py-3 bg-[var(--botanical-accent)] text-black rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refreshing ? "Processing..." : "Resume Scraper"}
            </button>

            <button
              onClick={handleResumeGenerator}
              disabled={refreshing}
              className="px-6 py-3 bg-[var(--botanical-accent-alt)] text-black rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refreshing ? "Processing..." : "Resume Generator"}
            </button>

            <button
              onClick={handleRefreshEmbeddings}
              disabled={refreshing}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refreshing ? "Processing..." : "Refresh Embeddings"}
            </button>

            <button
              onClick={() => handleBuildManifests(100)}
              disabled={refreshing}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refreshing ? "Processing..." : "Build Manifests (100)"}
            </button>

            <button
              onClick={() => handleBuildManifests()}
              disabled={refreshing}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refreshing ? "Processing..." : "Build All Manifests"}
            </button>

            <button
              onClick={() => handleRunProxyOCR(100)}
              disabled={refreshing}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refreshing ? "Processing..." : "Build Proxy + OCR (100)"}
            </button>

            <button
              onClick={() => handleRunProxyOCR()}
              disabled={refreshing}
              className="px-6 py-3 bg-emerald-700 text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refreshing ? "Processing..." : "Build All Proxy + OCR"}
            </button>

            <button
              onClick={() => handleRunProxyOCR(100, true)}
              disabled={refreshing}
              className="px-6 py-3 bg-indigo-500 text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refreshing ? "Processing..." : "Re-run OCR (100)"}
            </button>

            <button
              onClick={() => {
                fetchStatus();
                fetchCompleteness();
                fetchFlags();
              }}
              disabled={refreshing}
              className="px-6 py-3 bg-[var(--botanical-bg-deep)] border border-[var(--botanical-border)] text-[var(--botanical-text-primary)] rounded-lg font-semibold hover:border-[var(--botanical-accent)]/40 transition disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh All"}
            </button>
          </div>
          <p className="text-xs text-[var(--botanical-text-secondary)] mt-4">
            ⚠️ Resume buttons send signals to external processes. They do not execute scraping or generation directly.
            <br />
            ✅ Build Manifests is safe and idempotent - only writes manifest.json files, skips existing ones.
            <br />
            ✅ Build Proxy + OCR is safe - only reads raw images, copies best bud image, writes manifest updates, skips existing.
          </p>
        </div>

        {/* Flags Viewer */}
        <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-[var(--botanical-accent)]">
            Active Flags
          </h2>
          {flags.length === 0 ? (
            <p className="text-[var(--botanical-text-secondary)] text-sm">No active flags</p>
          ) : (
            <div className="space-y-2">
              {flags.map((flag) => (
                <button
                  key={flag}
                  onClick={() => fetchFlagDetails(flag.replace(".json", ""))}
                  className="w-full text-left px-4 py-2 bg-[var(--botanical-bg-deep)] border border-[var(--botanical-border)] rounded hover:border-[var(--botanical-accent)]/40 transition"
                >
                  <code className="text-[var(--botanical-accent)]">{flag}</code>
                </button>
              ))}
            </div>
          )}
          {selectedFlag && (
            <details className="mt-4">
              <summary className="cursor-pointer text-[var(--botanical-accent)] text-sm mb-2">
                Flag Details
              </summary>
              <pre className="bg-[var(--botanical-bg-deep)] p-4 rounded text-xs overflow-auto max-h-64">
                {JSON.stringify(selectedFlag, null, 2)}
              </pre>
            </details>
          )}
        </div>

        {/* Completeness Table */}
        <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-[var(--botanical-accent)]">
            Strain Completeness
          </h2>
          {loadingCompleteness ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-[var(--botanical-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-[var(--botanical-text-secondary)]">Loading completeness data...</p>
            </div>
          ) : completeness && completeness.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--botanical-border)]">
                    <th className="text-left py-2 px-3 text-[var(--botanical-accent)]">Slug</th>
                    <th className="text-right py-2 px-3 text-[var(--botanical-accent)]">Score</th>
                    <th className="text-right py-2 px-3 text-[var(--botanical-accent)]">Raw</th>
                    <th className="text-right py-2 px-3 text-[var(--botanical-accent)]">Gen</th>
                    <th className="text-center py-2 px-3 text-[var(--botanical-accent)]">Manifest</th>
                    <th className="text-center py-2 px-3 text-[var(--botanical-accent)]">Embedding</th>
                    <th className="text-center py-2 px-3 text-[var(--botanical-accent)]">Image</th>
                    <th className="text-center py-2 px-3 text-[var(--botanical-accent)]">OCR Status</th>
                    <th className="text-right py-2 px-3 text-[var(--botanical-accent)]">OCR Conf</th>
                    <th className="text-left py-2 px-3 text-[var(--botanical-accent)]">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {completeness.items.map((item) => (
                    <tr key={item.slug} className="border-b border-[var(--botanical-border)]/50 hover:bg-[var(--botanical-bg-deep)]">
                      <td className="py-2 px-3 font-mono text-xs text-[var(--botanical-text-primary)]">
                        {item.slug}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className={`font-semibold ${
                          item.score >= 80 ? "text-[var(--botanical-accent)]" :
                          item.score >= 50 ? "text-amber-400" :
                          "text-red-400"
                        }`}>
                          {item.score}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-[var(--botanical-text-secondary)]">
                        {item.rawCount}
                      </td>
                      <td className="py-2 px-3 text-right text-[var(--botanical-text-secondary)]">
                        {item.genCount}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {item.hasManifest ? "✅" : "❌"}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {item.hasEmbedding ? "✅" : "❌"}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {item.hasPublicImage ? "✅" : "❌"}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {item.ocrStatus ? (
                          <span className={`text-xs ${
                            item.ocrStatus === "complete" ? "text-[var(--botanical-accent)]" :
                            item.ocrStatus === "error" ? "text-red-400" :
                            "text-amber-400"
                          }`}>
                            {item.ocrStatus}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--botanical-text-secondary)]">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {item.ocrConfidence !== undefined ? (
                          <span className={`text-xs font-semibold ${
                            item.ocrConfidence >= 50 ? "text-[var(--botanical-accent)]" :
                            item.ocrConfidence > 0 ? "text-amber-400" :
                            "text-[var(--botanical-text-secondary)]"
                          }`}>
                            {item.ocrConfidence}%
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--botanical-text-secondary)]">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs text-[var(--botanical-text-secondary)]">
                        {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {completeness.total > completeness.items.length && (
                <p className="text-xs text-[var(--botanical-text-secondary)] mt-4 text-center">
                  Showing {completeness.items.length} of {completeness.total} strains
                </p>
              )}
            </div>
          ) : (
            <p className="text-[var(--botanical-text-secondary)] text-sm">No completeness data available</p>
          )}
        </div>

        {/* Raw Data (Collapsible) */}
        <details className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-6">
          <summary className="cursor-pointer text-[var(--botanical-accent)] font-semibold mb-4">
            Raw Status Data
          </summary>
          <pre className="bg-[var(--botanical-bg-deep)] p-4 rounded text-xs overflow-auto max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
