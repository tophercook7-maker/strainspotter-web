"use client";

import { useEffect, useMemo, useState } from "react";

type Reading = {
  id: string;
  garden_id: string;
  temp_f: number | null;
  rh: number | null;
  vpd: number | null;
  ph: number | null;
  nitrogen_ppm: number | null;
  phosphorus_ppm: number | null;
  potassium_ppm: number | null;
  source: string | null;
  recorded_at: string;
  created_at: string;
};

type ApiResponse = { gardenId: string; reading: Reading | null };

function formatNumber(value: unknown, suffix = ""): string {
  return typeof value === "number" && Number.isFinite(value) ? `${value}${suffix}` : "No readings yet";
}

function formatInt(value: unknown, suffix = ""): string {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value)}${suffix}` : "No readings yet";
}

function relativeDayLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const now = Date.now();
  const days = Math.floor((now - t) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default function GardenConsoleLiveClient(props: { initial?: ApiResponse | null }) {
  const [data, setData] = useState<ApiResponse | null>(props.initial ?? null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const resp = await fetch("/api/garden/console", { cache: "no-store" });
        const json = (await resp.json().catch(() => null)) as ApiResponse | null;
        if (!resp.ok || !json) throw new Error("bad_response");
        if (!cancelled) {
          setData(json);
          setLoadError(false);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      }
    }

    // immediate + interval
    tick();
    const id = window.setInterval(tick, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const r = data?.reading ?? null;

  const tiles = useMemo(
    () => [
      { label: "Temperature (°F)", value: formatNumber(r?.temp_f, "°F") },
      { label: "Humidity (%)", value: formatInt(r?.rh, "%") },
      { label: "Vapor Pressure Deficit (VPD)", value: formatNumber(r?.vpd, "") },
      { label: "Acidity (pH)", value: formatNumber(r?.ph, "") },
      { label: "Nitrogen (ppm)", value: formatInt(r?.nitrogen_ppm, " ppm") },
      { label: "Phosphorus (ppm)", value: formatInt(r?.phosphorus_ppm, " ppm") },
      { label: "Potassium (ppm)", value: formatInt(r?.potassium_ppm, " ppm") },
    ],
    [r]
  );

  const stamp = r?.recorded_at ?? null;
  const stampLabel = relativeDayLabel(stamp);

  return (
    <section className="space-y-4">
      {loadError && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
          Could not refresh live readings. Showing the most recent cached view.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-medium text-white/60">{t.label}</div>
            <div className="mt-1 text-2xl font-semibold text-white">{t.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="text-sm text-white/70">
          {stamp ? (
            <>
              Latest reading: <span className="text-white/90">{stampLabel}</span>
            </>
          ) : (
            "Latest reading: No readings yet"
          )}
        </div>

        <div className="text-xs text-white/50">
          Source: {r?.source ? r.source : "Unknown"}
        </div>
      </div>
    </section>
  );
}
