import React from "react";
import Link from "next/link";

const actions = [
  { id: "brand-schedule", label: "Choose Brand Schedule", href: "/growers/nutrients/brand-schedule" },
  { id: "customize", label: "Customize Feed Chart", href: "/growers/nutrients/customize" },
  { id: "ai-calculator", label: "AI Feed Calculator", href: "/growers/nutrients/ai-calculator" },
  { id: "ppm-ec", label: "PPM/EC Tools", href: "/growers/nutrients/ppm-ec" },
];

export default function NutrientsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-emerald-300 mb-2">Nutrient & Feed Calculator</h1>
        <p className="text-slate-400 mb-8">
          Feed schedules, PPM/EC tools, and AI-powered nutrient calculations.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {actions.map((action) => (
            <Link key={action.id} href={action.href}>
              <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500 transition cursor-pointer">
                <h2 className="text-lg font-semibold text-slate-100">
                  {action.label}
                </h2>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

