import React from "react";

export default function GrowerProfilePage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-emerald-300 mb-2">Grower Profile</h1>
        <p className="text-slate-400 mb-8">
          View grower profile, facilities, strains, and achievements.
        </p>

        <div className="p-6 rounded-lg bg-slate-900 border border-slate-800">
          <p className="text-slate-400">
            Profile ID: {params.id}
          </p>
          <p className="text-sm text-slate-500 mt-4">
            Profile content will be implemented here.
          </p>
        </div>
      </div>
    </div>
  );
}

