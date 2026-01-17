"use client";

import { useState, useEffect } from "react";

const AGE_GATE_KEY = "ss_age21_ok";

export default function AgeGate({ children }: { children: React.ReactNode }) {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(AGE_GATE_KEY) : null;
    if (stored === "true") {
      setIsVerified(true);
    } else {
      setIsVerified(false);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(AGE_GATE_KEY, "true");
    setIsVerified(true);
  };

  const handleDecline = () => {
    setDeclined(true);
  };

  if (isVerified === null) {
    return null;
  }

  if (declined) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[url('/backgrounds/garden-field.jpg')] bg-cover bg-center text-white flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative text-center p-8 max-w-md">
          <img
            src="/brand/core/hero.png"
            alt="StrainSpotter AI"
            className="w-24 h-24 mx-auto mb-6 drop-shadow-lg"
          />
          <h1 className="text-3xl font-bold mb-4">Access Restricted</h1>
          <p className="text-lg text-white/80 mb-6">
            You must be 21 or older to use StrainSpotter AI.
          </p>
          <p className="text-sm text-white/70">
            Please refresh the page if you made a mistake.
          </p>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[url('/backgrounds/garden-field.jpg')] bg-cover bg-center text-white flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
        <div className="relative bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-black/25 text-center">
          <img
            src="/brand/core/hero.png"
            alt="StrainSpotter AI"
            className="w-24 h-24 mx-auto mb-6 drop-shadow-lg"
          />
          <h1 className="text-3xl font-bold mb-3">
            Are you 21 or older?
          </h1>
          <p className="text-white/80 mb-8">
            Confirm to enter StrainSpotter AI.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDecline}
              className="flex-1 px-6 py-3 bg-red-500/15 text-red-100 rounded-lg hover:bg-red-500/25 transition border border-red-300/30"
            >
              No
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 px-6 py-3 bg-emerald-400 text-black font-semibold rounded-lg hover:bg-emerald-300 transition shadow-lg shadow-emerald-500/40"
            >
              Yes, I'm 21+
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

