"use client";

import { useState } from "react";

interface GrowLogbookPaywallProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => Promise<void>;
}

export default function GrowLogbookPaywall({ isOpen, onClose, onUpgrade }: GrowLogbookPaywallProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/membership/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "garden" }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to upgrade");
      }

      if (onUpgrade) {
        await onUpgrade();
      }
      onClose();
      window.location.reload();
    } catch (error) {
      console.error("Error upgrading:", error);
      alert(error instanceof Error ? error.message : "Failed to upgrade");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-xl p-8 max-w-md w-full">
        <h2 className="text-3xl font-bold text-[var(--botanical-accent-alt)] mb-4">
          Grow Logbook
        </h2>

        <p className="text-lg text-[var(--botanical-text-primary)] mb-6 leading-relaxed">
          Your personal grow journal.
          <br />
          Track every grow, log daily progress,
          <br />
          and unlock AI guidance with Grow Coach.
        </p>

        <div className="mb-6">
          <div className="text-3xl font-bold text-[var(--botanical-accent)] mb-1">
            $9.99<span className="text-lg text-[var(--botanical-text-secondary)]">/month</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg border border-[var(--botanical-border)] text-[var(--botanical-text-primary)] hover:bg-[var(--botanical-bg-deep)] transition"
          >
            Cancel
          </button>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg bg-[var(--botanical-accent)] text-black font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? "Processing..." : "Unlock Grow Logbook + Grow Coach"}
          </button>
        </div>
      </div>
    </div>
  );
}
