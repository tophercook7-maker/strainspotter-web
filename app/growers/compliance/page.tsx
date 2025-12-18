import React from "react";
import Link from "next/link";

const actions = [
  { id: "plant-count", label: "Plant Count", href: "/growers/compliance/plant-count" },
  { id: "waste", label: "Waste Logs", href: "/growers/compliance/waste" },
  { id: "transport", label: "Transport Manifests", href: "/growers/compliance/transport" },
  { id: "reports", label: "Compliance Reports", href: "/growers/compliance/reports" },
  { id: "metrc", label: "METRC Sync", href: "/growers/compliance/metrc" },
];

export default function CompliancePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-xs font-semibold mb-4">
            PRO FEATURE
          </div>
          <h1 className="text-3xl font-bold text-emerald-300 mb-2">Compliance</h1>
          <p className="text-slate-400 mb-8">
            Plant counts, waste logs, transport manifests, and METRC synchronization.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {actions.map((action) => (
            <Link key={action.id} href={action.href}>
              <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500 transition cursor-pointer opacity-50">
                <h2 className="text-lg font-semibold text-slate-100">
                  {action.label}
                </h2>
                <p className="text-xs text-emerald-400 mt-2">
                  Pro Feature
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

