"use client";

import { useState, useEffect } from "react";

const AGE_GATE_KEY = "ss_age21_ok";

export default function AgeGate({ children }: { children: React.ReactNode }) {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    // Check localStorage on mount
    const stored = localStorage.getItem(AGE_GATE_KEY);
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

  // Show nothing while checking
  if (isVerified === null) {
    return null;
  }

  // Show blocked screen if declined
  if (declined) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black text-white flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-3xl font-bold mb-4">Access Restricted</h1>
          <p className="text-lg text-gray-300 mb-6">
            You must be 21 or older to use StrainSpotter.
          </p>
          <p className="text-sm text-gray-500">
            Please refresh the page if you made a mistake.
          </p>
        </div>
      </div>
    );
  }

  // Show age gate if not verified
  if (!isVerified) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm text-white flex items-center justify-center">
        <div className="bg-neutral-900 rounded-lg p-8 max-w-md w-full mx-4 border border-neutral-700">
          <h1 className="text-3xl font-bold mb-4 text-center">
            Are you 21 or older?
          </h1>
          <p className="text-gray-300 text-center mb-8">
            You must be 21 or older to access StrainSpotter.
          </p>
          <div className="flex gap-4">
            <button
              onClick={handleDecline}
              className="flex-1 px-6 py-3 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition border border-red-500/30"
            >
              No
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 px-6 py-3 bg-emerald-600 text-black font-semibold rounded-lg hover:bg-emerald-500 transition"
            >
              Yes, I'm 21+
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Verified - show children
  return <>{children}</>;
}

