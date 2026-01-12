"use client";

export default function DispensaryFinderPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "black",
        color: "#4ade80",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "420px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "12px" }}>
          Dispensary Finder
        </h1>

        <p style={{ opacity: 0.75, marginBottom: "12px" }}>
          This section is online and build-safe.
        </p>

        <p style={{ fontSize: "14px", opacity: 0.5 }}>
          State-based listings • No maps • No paid APIs
        </p>
      </div>
    </main>
  );
}
"use client";

export default function DispensaryFinderPage() {
  return (
    <main className="min-h-screen bg-black text-green-400 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Dispensary Finder</h1>
        <p className="opacity-70">
          Module temporarily disabled while rebuilding.
        </p>
      </div>
    </main>
  );
}
