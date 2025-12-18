import React from "react";
import Link from "next/link";

const actions = [
  { id: "view-all", label: "View All Growers", href: "/growers/directory/all" },
  { id: "search", label: "Search Growers", href: "/growers/directory/search" },
  { id: "top", label: "Top Growers", href: "/growers/directory/top" },
  { id: "new", label: "New Growers", href: "/growers/directory/new" },
  { id: "followers", label: "Your Followers", href: "/growers/directory/followers" },
  { id: "following", label: "Your Following", href: "/growers/directory/following" },
];

export default function GrowerDirectoryPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-emerald-300 mb-2">Grower Directory</h1>
        <p className="text-slate-400 mb-8">
          Browse, search, and connect with growers in the community.
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

