"use client";

// QrCoaPanel — shows what the package's QR code(s) decode to. A COA QR points at
// the official lab certificate for that batch, so this surfaces a tappable link
// to the real cert (honest, verifiable). Non-URL codes are shown as raw text.

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

// Heuristic: does this URL look like a lab COA link?
function looksLikeCoa(url: string): boolean {
  return /coa|lab|cert|result|confidentcannabis|sclabs|kaycha|steephill|analytics|potency|test/i.test(url);
}

export default function QrCoaPanel({ codes }: { codes: string[] }) {
  if (!codes || codes.length === 0) return null;

  return (
    <div style={{
      marginBottom: 14, borderRadius: 16, overflow: "hidden",
      background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.30)",
    }}>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(52,211,153,0.16)" }}>
        <span style={{ fontSize: 18 }}>🔗</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: "#6ee7b7" }}>
            {codes.length > 1 ? `${codes.length} codes on the package` : "Code on the package"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Decoded from the QR — links go to the official source</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#04120b", background: "#34d399", borderRadius: 6, padding: "3px 7px" }}>QR</span>
      </div>

      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {codes.map((code, i) => {
          if (isUrl(code)) {
            const coa = looksLikeCoa(code);
            return (
              <a
                key={i}
                href={code}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", borderRadius: 12,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  textDecoration: "none",
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>{coa ? "🧾" : "🌐"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "#fff" }}>
                    {coa ? "Lab certificate (COA)" : "Package link"}
                  </div>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {domainOf(code)}
                  </div>
                </div>
                <span style={{ flexShrink: 0, color: "#6ee7b7", fontWeight: 800, fontSize: 13 }}>Open →</span>
              </a>
            );
          }
          return (
            <div key={i} style={{
              padding: "11px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>QR contents</div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.8)", wordBreak: "break-word", lineHeight: 1.5 }}>{code}</div>
            </div>
          );
        })}
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
          We show you exactly what the code contains — always verify a certificate on the lab&rsquo;s own site.
        </div>
      </div>
    </div>
  );
}
