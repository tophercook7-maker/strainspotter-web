"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function GrowDoctorPage() {
  const router = useRouter();
  const [hasScans, setHasScans] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has any doctor scans
    async function checkScans() {
      try {
        // Try to fetch scans - if API doesn't support filtering, just show the default state
        const response = await fetch("/api/scans", {
          credentials: "include",
        });
        
        if (response.ok) {
          const data = await response.json();
          const scans = Array.isArray(data?.scans) ? data.scans : Array.isArray(data) ? data : [];
          // Filter for doctor scans if available
          const doctorScans = scans.filter((scan: any) => scan.scan_type === 'doctor' || scan.type === 'doctor');
          setHasScans(doctorScans.length > 0);
        } else {
          // API might not be available, default to false (show "Start Doctor Scan")
          setHasScans(false);
        }
      } catch (err) {
        console.error("Error checking scans:", err);
        // Fail gracefully - show "Start Doctor Scan" option
        setHasScans(false);
      } finally {
        setLoading(false);
      }
    }

    checkScans();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white overflow-x-hidden safe-area-bottom flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden safe-area-bottom" style={{ padding: 16, maxWidth: 640, margin: "0 auto" }}>
      <Link href="/garden" className="text-emerald-400 mb-4 inline-block text-sm hover:text-emerald-300 transition">
        ← Back to Garden
      </Link>

      <h1 className="text-3xl font-bold mb-2">Grow Doctor</h1>
      <p className="opacity-85 mb-6">
        Diagnose plant health issues with AI-powered analysis. Upload photos to identify problems and get treatment plans.
      </p>

      {!hasScans ? (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-700">
            <p className="text-sm text-neutral-300 mb-3">
              Run a Doctor Scan to diagnose issues with your plants.
            </p>
            <p className="text-xs text-neutral-400 mb-4">
              Doctor scans analyze plant health, identify problems, and provide treatment recommendations.
            </p>
            <button
              onClick={() => router.push("/scanner")}
              className="w-full py-3 px-4 bg-emerald-600 text-black rounded-lg font-semibold hover:opacity-90 transition"
            >
              Start Doctor Scan
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-700">
            <p className="text-sm text-neutral-300 mb-3">
              You have doctor scan results available. View them in your scan history or run a new scan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/scanner")}
                className="flex-1 py-3 px-4 bg-emerald-600 text-black rounded-lg font-semibold hover:opacity-90 transition"
              >
                New Doctor Scan
              </button>
              <Link
                href="/garden"
                className="px-4 py-3 bg-neutral-800 border border-neutral-700 text-white rounded-lg font-semibold hover:bg-neutral-700 transition flex items-center"
              >
                View Scans
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
