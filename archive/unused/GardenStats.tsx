'use client';

export function GardenStats() {
  return (
    <div className="mt-6 mb-6 bg-black/50 backdrop-blur-xl rounded-xl
      border border-green-500/30 p-4 text-center shadow-xl">
      
      <h2 className="text-lg font-semibold text-green-200">
        Your Stats
      </h2>

      <div className="flex justify-around mt-3 text-sm opacity-90">
        <div>
          <p className="font-bold text-green-300">22</p>
          <p>Scans Left</p>
        </div>
        <div>
          <p className="font-bold text-green-300">4</p>
          <p>Doctor Scans</p>
        </div>
        <div>
          <p className="font-bold text-green-300">Starter</p>
          <p>Membership</p>
        </div>
      </div>
    </div>
  );
}
