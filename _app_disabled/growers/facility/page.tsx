import React from "react";
import Link from "next/link";

const actions = [
  { id: "rooms", label: "Rooms & Tents", href: "/growers/facility/rooms" },
  { id: "environment", label: "Environment Dashboard", href: "/growers/facility/environment" },
  { id: "lights", label: "Light Schedules", href: "/growers/facility/lights" },
  { id: "feeds", label: "Feed Schedules", href: "/growers/facility/feeds" },
  { id: "plant-count", label: "Plant Count Tracker", href: "/growers/facility/plant-count", locked: "pro" },
  { id: "metrc", label: "METRC Integration", href: "/growers/facility/metrc", locked: "pro" },
];

export default function FacilityDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-emerald-300 mb-2">Facility Dashboard</h1>
        <p className="text-slate-400 mb-8">
          Manage rooms, tents, environment controls, and schedules.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {actions.map((action) => (
            <Link key={action.id} href={action.href}>
              <div
                className={`p-5 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500 transition cursor-pointer
                  ${action.locked === "pro" ? "opacity-50" : ""}`}
              >
                <h2 className="text-lg font-semibold text-slate-100">
                  {action.label}
                </h2>
                {action.locked === "pro" && (
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

