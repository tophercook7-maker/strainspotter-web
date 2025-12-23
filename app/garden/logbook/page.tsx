"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { StageChip } from "@/components/logbook/StageChip";

export default function LogbookPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [grows, setGrows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    // Check for ?new=true - redirect to new grow creation
    const isNew = searchParams.get("new");
    if (isNew === "true") {
      router.replace("/garden/logbook/new");
      return;
    }

    fetch("/api/garden/grows", {
      credentials: "include",
    })
      .then(async r => {
        const text = await r.text();
        const json = text ? JSON.parse(text) : null;
        return json;
      })
      .then(data => {
        const growsArray = Array.isArray(data?.grows) ? data.grows : Array.isArray(data) ? data : [];
        setGrows(growsArray);
        setLoading(false);
        
        // Check for prefill param - if single grow exists, redirect to that grow's logbook
        const prefill = searchParams.get("prefill");
        if (prefill && growsArray.length === 1) {
          // Preserve the prefill parameter in the redirect (re-encode to ensure it's properly encoded)
          const growId = growsArray[0].id;
          const encodedPrefill = encodeURIComponent(prefill);
          router.replace(`/garden/logbook/${growId}?prefill=${encodedPrefill}`);
          return;
        }

        // Check for "Log Today" reminder
        if (growsArray.length > 0) {
          // Get most recent log across all grows
          Promise.all(
            growsArray.map((grow: any) =>
              fetch(`/api/garden/logs?grow_id=${grow.id}`, {
                credentials: "include",
              })
                .then(async r => {
                  const text = await r.text();
                  const json = text ? JSON.parse(text) : null;
                  return json;
                })
                .then(logs => ({ grow, logs: Array.isArray(logs?.logs) ? logs.logs : [] }))
            )
          ).then(results => {
            const allLogs = results.flatMap(r => r.logs.map((log: any) => ({
              ...log,
              grow_id: r.grow.id
            })));
            
            if (allLogs.length > 0) {
              const lastLog = allLogs.sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0];
              
              const hoursSinceLast = (Date.now() - new Date(lastLog.created_at).getTime()) / 36e5;
              if (hoursSinceLast > 20) {
                setShowReminder(true);
              }
            } else {
              // No logs yet, show reminder
              setShowReminder(true);
            }
          });
        }
      })
      .catch(err => {
        console.error("Error fetching grows:", err);
        setLoading(false);
      });
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white" style={{ padding: 16 }}>
      <Link href="/garden" className="text-emerald-400 mb-4 inline-block text-sm">
        ← Back to Garden
      </Link>
      <h1 className="text-2xl font-bold mb-4">Grow Logbook</h1>

      {showReminder && (
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            background: "#102820",
            border: "1px solid #1f4d3a",
            marginBottom: 14,
          }}
        >
          <p className="text-emerald-400 font-medium">🌱 Haven't logged today?</p>
          <div style={{ opacity: 0.85, marginTop: 4, fontSize: 14, color: "#a7f3d0" }}>
            A quick note improves Grow Coach accuracy.
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <Link href="/garden/logbook/new">
          <button className="w-full py-3 px-4 bg-emerald-600 text-black rounded-lg font-semibold">
            Add Grow
          </button>
        </Link>
        {grows.length >= 2 && (
          <Link href="/garden/logbook/compare">
            <button className="w-full py-3 px-4 bg-neutral-800 border border-neutral-700 text-white rounded-lg font-semibold hover:bg-neutral-700 transition">
              Compare Grows
            </button>
          </Link>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        {grows.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>No grows yet. Start your first grow!</p>
          </div>
        ) : (
          grows.map(grow => {
            // Preserve prefill param when user selects a grow
            const prefill = searchParams.get("prefill");
            const href = prefill 
              ? `/garden/logbook/${grow.id}?prefill=${encodeURIComponent(prefill)}`
              : `/garden/logbook/${grow.id}`;
            return (
            <Link key={grow.id} href={href}>
              <div
                className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 mb-3 hover:border-emerald-500/50 transition-colors"
                style={{
                  padding: 14,
                  borderRadius: 16,
                  border: "1px solid #333",
                  marginBottom: 14,
                  background: "#111",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong className="text-lg">{grow.strain_name}</strong>
                  <StageChip stage={grow.stage} />
                </div>
                <div className="text-sm text-gray-400">Started: {grow.start_date}</div>
              </div>
            </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
