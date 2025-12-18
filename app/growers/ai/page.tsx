import React from "react";
import Link from "next/link";

const aiModules = [
  { id: "coach", label: "AI Grow Coach", href: "/ai/coach" },
  { id: "doctor", label: "AI Grow Doctor", href: "/ai/doctor" },
  { id: "advisor", label: "AI Strain Advisor", href: "/ai/advisor" },
  { id: "environment", label: "AI Environment Advisor", href: "/ai/environment" },
  { id: "journal", label: "AI Journal Summary", href: "/ai/journal" },
  { id: "phenotype", label: "AI Phenotype Predictor", href: "/ai/phenotype", locked: "pro" },
];

export default function AIGrowerSystemPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-emerald-300 mb-2">AI Grower System</h1>
        <p className="text-slate-400 mb-8">
          AI-powered grow coaching, diagnostics, advisors, and phenotype predictions.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {aiModules.map((module) => (
            <Link key={module.id} href={module.href}>
              <div
                className={`p-5 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500 transition cursor-pointer
                  ${module.locked === "pro" ? "opacity-50" : ""}`}
              >
                <h2 className="text-lg font-semibold text-slate-100">
                  {module.label}
                </h2>
                {module.locked === "pro" && (
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

