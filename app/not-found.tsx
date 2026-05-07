import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0f0a",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        textAlign: "center",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 16, lineHeight: 1 }}>🍃</div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          margin: "0 0 8px",
          letterSpacing: -0.4,
        }}
      >
        Page not found
      </h1>
      <p
        style={{
          color: "rgba(255,255,255,0.55)",
          fontSize: 14,
          lineHeight: 1.6,
          margin: "0 0 22px",
          maxWidth: 320,
        }}
      >
        We couldn&rsquo;t find what you were looking for. Maybe it moved,
        maybe it never existed.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/garden/scanner"
          style={{
            padding: "12px 22px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #43A047, #2E7D32)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Open Scanner
        </Link>
        <Link
          href="/garden"
          style={{
            padding: "12px 22px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Garden
        </Link>
      </div>
    </div>
  );
}
