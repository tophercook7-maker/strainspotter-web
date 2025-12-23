'use client';

export function RecentScans() {
  return (
    <section className="mt-10 pb-10">
      <h3 className="text-lg font-semibold mb-3 text-green-200">Recent Scans</h3>

      <div className="flex gap-3 overflow-x-auto no-scrollbar px-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="min-w-[100px] h-[100px] bg-black/50 border border-green-500/30
            rounded-xl backdrop-blur-xl flex items-center justify-center text-green-200 shadow-md"
          >
            —
          </div>
        ))}
      </div>
    </section>
  );
}
