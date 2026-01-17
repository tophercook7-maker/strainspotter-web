// components/NotEnoughCreditsModal.tsx

"use client";

interface NotEnoughCreditsModalProps {
  credits?: number;
  onClose: () => void;
}

export default function NotEnoughCreditsModal({ credits = 0, onClose }: NotEnoughCreditsModalProps) {
  return (
    <div className="credit-modal-overlay" onClick={onClose}>
      <div className="credit-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="credit-title">Not Enough Credits</h2>
        
        <p className="credit-sub">
          You have <strong>{credits}</strong> credits remaining.
        </p>

        <p className="credit-desc">
          Scanning requires 1 credit.  
          Top up or join the Garden for unlimited scanning.
        </p>

        <div className="credit-actions">
          <button
            className="credit-btn primary"
            onClick={() => window.location.href = "/topup"}
          >
            Buy Credits
          </button>

          <button
            className="credit-btn gold"
            onClick={() => window.location.href = "/join"}
          >
            Join the Garden
          </button>
        </div>

        <button className="credit-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

