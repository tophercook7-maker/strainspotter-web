/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import MembershipExplanation from "@/components/membership/MembershipExplanation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSelectedGrow } from "@/components/garden/SelectedGrowProvider";

type Diagnosis = {
  title: string;
  confidence: "Low" | "Moderate" | "High";
  evidence: string[];
};

type ActionItem = {
  text: string;
};

const sampleDiagnoses: Diagnosis[] = [
  {
    title: "Likely nitrogen deficiency",
    confidence: "High",
    evidence: [
      "Leaf color shift across last 2 scans",
      "Nitrogen levels below your typical range",
      "Similar pattern observed in a previous grow",
    ],
  },
  {
    title: "Early heat stress detected",
    confidence: "Moderate",
    evidence: [
      "Canopy temperature trending above your baseline",
      "Slight leaf curl noted in recent log",
      "VPD higher than your usual range",
    ],
  },
];

const sampleActions: ActionItem[] = [
  { text: "Increase nitrogen slightly at next feeding" },
  { text: "Monitor leaf color over the next 48 hours" },
  { text: "Re-scan after adjustment" },
];

type GrowDoctorPageProps = {
  tier?: "free" | "garden" | "pro" | null;
};

export default function GrowDoctorPage({ tier = "free" }: GrowDoctorPageProps) {
  const hasGarden = tier === "garden" || tier === "pro";
  const { selectedGrow } = useSelectedGrow();
  const [loading, setLoading] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const growNeeded = !selectedGrow;

  const loadData = async () => {
    setLoading(true);
    setTimedOut(false);
    setError(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setTimedOut(true);
      setLoading(false);
    }, 10000);
    // placeholder for future fetch; keep sample data if fetch skipped
    try {
      // no-op: using sampleDiagnoses/sampleActions as placeholder
    } catch (err: any) {
      setError(err.message || "failed");
    } finally {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!growNeeded) {
      void loadData();
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [growNeeded]);

  return (
    <main className="relative min-h-screen w-full bg-[url('/backgrounds/garden-field.jpg')] bg-cover bg-center text-white flex flex-col items-center px-4 py-14">
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 w-full max-w-5xl space-y-10">
        {/* Header */}
        <header className="text-center space-y-3">
          <div className="w-24 h-24 rounded-full overflow-hidden mx-auto flex items-center justify-center bg-transparent">
            <img
              src="/brand/core/hero.png"
              alt="Grow Doctor"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Grow Doctor</h1>
          <p className="text-white/85 max-w-2xl mx-auto text-base sm:text-lg">
            Cultivation diagnostics based on your grow’s data.
          </p>
          <div className="mt-2">
            <Link
              href="/garden/chat?diagnosis_id=current"
              className="text-emerald-300 text-sm hover:text-emerald-200 underline underline-offset-4"
            >
              Garden Chat
            </Link>
          </div>
        </header>

        {growNeeded && (
          <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-6 text-center space-y-2">
            <h2 className="text-xl font-semibold text-white">Choose a grow</h2>
            <p className="text-sm text-white/70">Grow Doctor insights are tied to a specific grow.</p>
            <Link
              href="/garden/grows?prompt=Choose%20a%20grow%20for%20Grow%20Doctor"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-500 text-black font-semibold hover:bg-emerald-400"
            >
              Select a grow
            </Link>
          </div>
        )}

        {!growNeeded && loading && !timedOut && (
          <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-6 text-center space-y-2">
            <p className="text-sm text-white/80">Gathering insight…</p>
          </div>
        )}

        {!growNeeded && timedOut && (
          <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-6 text-center space-y-3">
            <p className="text-lg font-semibold text-white">Still gathering insight</p>
            <p className="text-sm text-white/70">Your grow’s history is intact. Insight will appear shortly.</p>
            <Link
              href="/garden"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white/10 text-white border border-white/15 hover:bg-white/15"
            >
              Back to Garden
            </Link>
          </div>
        )}

        {!growNeeded && !loading && !timedOut && (
          <>
            {/* Section 1: Since Last Check */}
            <section className="space-y-3">
              <div className="text-sm uppercase tracking-[0.08em] text-white/70">Since last check</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Timeline summary", detail: "Observing your recent updates" },
                  { label: "New scans", detail: "Scans are being documented" },
                  { label: "New logs / measurements", detail: "Updates recorded over time" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-4 flex flex-col gap-1"
                  >
                    <div className="text-white/70 text-sm">{item.label}</div>
                    <div className="text-white font-semibold">{item.detail}</div>
                  </div>
                ))}
              </div>
            </section>

            <GrowDoctorDiagnosisSection hasGarden={hasGarden} diagnoses={sampleDiagnoses} />

            <RecommendedActionsSection hasGarden={hasGarden} actions={sampleActions} />
          </>
        )}

        {!hasGarden && (
          <MembershipExplanation
            tier={tier}
            showLearnMore={true}
            learnMoreHref="/garden/membership"
            collapsedByDefault={true}
          />
        )}

        {/* Footer disclaimer */}
        <footer className="text-center text-white/60 text-xs">
          These diagnoses are based on observed cultivation patterns and are intended for educational use.
        </footer>
      </div>
    </main>
  );
}

function GrowDoctorDiagnosisSection({
  hasGarden,
  diagnoses,
}: {
  hasGarden: boolean;
  diagnoses: Diagnosis[];
}) {
  return (
    <section className="space-y-3">
      <div className="text-sm uppercase tracking-[0.08em] text-white/70">Grow Doctor Insight</div>
      <p className="text-xs text-white/70">This pattern has been observed across recent activity. Changes related to this condition typically appear gradually.</p>
      {!hasGarden ? (
        <FreeGate />
      ) : diagnoses.length === 0 ? (
        <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-5 text-white/80">
          No concerning conditions detected at this time.
        </div>
      ) : (
        <div className="space-y-4">
          {diagnoses.map((diag) => (
            <DiagnosticCard key={diag.title} diagnosis={diag} />
          ))}
        </div>
      )}
    </section>
  );
}

function RecommendedActionsSection({
  hasGarden,
  actions,
}: {
  hasGarden: boolean;
  actions: ActionItem[];
}) {
  return (
    <section className="space-y-3">
      <div className="text-sm uppercase tracking-[0.08em] text-white/70">Recommended next steps</div>
      {!hasGarden ? (
        <FreeGate />
      ) : (
        <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-5">
          <div className="space-y-3">
            {actions.map((action) => (
              <div
                key={action.text}
                className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white"
              >
                {action.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function DiagnosticCard({ diagnosis }: { diagnosis: Diagnosis }) {
  return (
    <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-5 space-y-4">
      <div className="flex flex-col gap-2">
        <div className="text-lg font-semibold text-white">{diagnosis.title}</div>
        <div className="text-sm text-white/80">Confidence: {diagnosis.confidence}</div>
      </div>
      <div className="space-y-2">
        <div className="text-white/70 text-sm">This pattern has been observed across recent activity.</div>
        <ul className="list-disc list-inside text-white/80 space-y-1">
          {diagnosis.evidence.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="space-y-2">
        <div className="text-white/70 text-sm">Some growers address this by…</div>
        <ul className="list-disc list-inside text-white/80 space-y-1">
          {sampleActions.map((action) => (
            <li key={action.text}>{action.text}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DiagnosisConfidence({ level }: { level: Diagnosis["confidence"] }) {
  const bar =
    level === "High"
      ? "bg-emerald-400"
      : level === "Moderate"
      ? "bg-emerald-300"
      : "bg-emerald-200";
  return (
    <div className="flex items-center gap-3">
      <div className="text-sm text-white/80">Confidence: {level}</div>
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full ${bar}`} style={{ width: level === "High" ? "85%" : level === "Moderate" ? "60%" : "35%" }} />
      </div>
    </div>
  );
}

function FreeGate() {
  return (
    <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-5 flex flex-col gap-3 items-start">
      <div className="text-white font-semibold">Cultivation diagnostics are available with a Garden membership.</div>
      <Link
        href="/pricing/professional"
        className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-400 text-black font-semibold hover:bg-emerald-300 transition"
      >
        Unlock diagnostics
      </Link>
    </div>
  );
}

