import React from "react";
import Link from "next/link";

const modules = [
  {
    id: "directory",
    label: "Grower Directory",
    href: "/growers/directory",
    description: "Browse, search, and connect with growers.",
  },
  {
    id: "facility",
    label: "Facility Dashboard",
    href: "/growers/facility",
    description: "Manage rooms, tents, and environment controls.",
  },
  {
    id: "batches",
    label: "Batch Manager",
    href: "/growers/batches",
    description: "Track harvest batches, weights, and labels.",
  },
  {
    id: "compliance",
    label: "Compliance",
    href: "/growers/compliance",
    description: "Plant counts, waste logs, and METRC sync.",
    locked: "pro",
  },
  {
    id: "nutrients",
    label: "Nutrient & Feed Calculator",
    href: "/growers/nutrients",
    description: "Feed schedules, PPM/EC tools, and AI calculator.",
  },
  {
    id: "coa-batch",
    label: "COA Batch Processor",
    href: "/growers/coa-batch",
    description: "Upload, extract, and compare COA results.",
  },
  {
    id: "teams",
    label: "Grower Teams",
    href: "/growers/teams",
    description: "Create teams, manage members, and shared gardens.",
  },
  {
    id: "chat",
    label: "Chat",
    href: "/growers/chat",
    description: "Group rooms, private messages, and notifications.",
  },
  {
    id: "analytics",
    label: "Grower Analytics",
    href: "/growers/analytics",
    description: "Yield analytics, efficiency metrics, and predictions.",
  },
  {
    id: "ai",
    label: "AI Grower System",
    href: "/growers/ai",
    description: "AI-powered grow coaching, diagnostics, and advisors.",
  },
];

export default function GrowersPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-emerald-300 mb-2">Grower System</h1>
        <p className="text-slate-400 mb-8">
          Professional grower tools, compliance, and team management.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => (
            <Link key={mod.id} href={mod.href}>
              <div
                className={`p-5 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500 transition cursor-pointer
                  ${mod.locked === "pro" ? "opacity-50" : ""}`}
              >
                <h2 className="text-lg font-semibold text-slate-100 mb-2">
                  {mod.label}
                </h2>
                <p className="text-sm text-slate-400">
                  {mod.description}
                </p>
                {mod.locked === "pro" && (
                  <p className="text-xs text-emerald-400 mt-2">
                    Pro Feature
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

