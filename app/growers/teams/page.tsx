import React from "react";
import Link from "next/link";

const actions = [
  { id: "create", label: "Create Team", href: "/growers/teams/create" },
  { id: "manage", label: "Manage Members", href: "/growers/teams/manage" },
  { id: "gardens", label: "Shared Gardens", href: "/growers/teams/gardens" },
  { id: "messaging", label: "Messaging", href: "/growers/teams/messaging" },
  { id: "permissions", label: "Assign Permissions", href: "/growers/teams/permissions" },
];

export default function GrowerTeamsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-emerald-300 mb-2">Grower Teams</h1>
        <p className="text-slate-400 mb-8">
          Create teams, manage members, shared gardens, and permissions.
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

