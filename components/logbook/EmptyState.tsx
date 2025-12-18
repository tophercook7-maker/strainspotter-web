"use client";

export function EmptyState() {
  return (
    <div style={{
      marginTop: 32,
      padding: 32,
      borderRadius: 20,
      border: "2px dashed #34d399",
      background: "linear-gradient(135deg, #0a1a0a 0%, #111 100%)",
      textAlign: "center",
      marginBottom: 40,
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#34d399" }}>
        Start Your Grow Logbook
      </h3>
      <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 16, lineHeight: 1.6 }}>
        Track your grow's progress day by day. Log notes, photos, and milestones to build a complete timeline.
      </p>
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: 8, 
        marginTop: 20,
        fontSize: 13,
        opacity: 0.7,
      }}>
        <div>✓ Daily notes and observations</div>
        <div>✓ Photo documentation</div>
        <div>✓ Stage tracking</div>
        <div>✓ Streak building</div>
      </div>
    </div>
  );
}
