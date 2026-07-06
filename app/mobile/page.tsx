import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = {
  title: "StrainSpotter on your phone",
  description:
    "Use StrainSpotter on your phone for the strongest strain IDs—live capture, close-ups, and consistent image quality. Web scanning still works.",
};

export default function MobileAppPage() {
  const externalInstall = (() => {
    const v = process.env.NEXT_PUBLIC_MOBILE_APP_URL?.trim();
    if (!v) return null;
    if (v.startsWith("http://") || v.startsWith("https://")) return v;
    return null;
  })();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0a0f0a 0%, #0d1a0d 45%, #0a0f0a 100%)",
        color: "#fff",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "28px 20px 48px",
      }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <p style={{ margin: "0 0 16px", fontSize: 13 }}>
          <Link
            href="/garden/scanner"
            style={{ color: "rgba(255,255,255,0.45)", textDecoration: "none" }}
          >
            ← Scanner
          </Link>
        </p>

        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: -0.4,
            margin: "0 0 12px",
            lineHeight: 1.15,
          }}
        >
          StrainSpotter on your phone
        </h1>
        <p
          style={{
            margin: "0 0 20px",
            fontSize: 15,
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.55)",
          }}
        >
          Web scanning works. The phone experience is usually best for the strongest IDs,
          because live camera capture makes it easier to get{" "}
          <strong style={{ color: "rgba(255,255,255,0.85)" }}>sharp close-ups</strong>,{" "}
          <strong style={{ color: "rgba(255,255,255,0.85)" }}>multiple angles</strong>, and{" "}
          <strong style={{ color: "rgba(255,255,255,0.85)" }}>more consistent image quality</strong>
          —especially for similar-looking strains.
        </p>

        <div
          style={{
            padding: "16px 18px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 1.1,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
              margin: "0 0 10px",
            }}
          >
            Native app status
          </h2>
          {externalInstall ? (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.72)" }}>
              Install the public build:{" "}
              <a
                href={externalInstall}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#6ee7b7", fontWeight: 700 }}
              >
                open install link
              </a>
              . (This URL is configured for this deployment.)
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.72)" }}>
              There&rsquo;s no App Store or Google Play listing — app stores don&rsquo;t allow
              cannabis apps. The web app IS the app: add strainspotter.app to your home
              screen (steps below) and it runs full-screen with everything included.
            </p>
          )}
        </div>

        <div
          style={{
            padding: "16px 18px",
            borderRadius: 14,
            background: "rgba(52,211,153,0.08)",
            border: "1px solid rgba(52,211,153,0.22)",
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 1.1,
              textTransform: "uppercase",
              color: "rgba(165,214,167,0.9)",
              margin: "0 0 10px",
            }}
          >
            What you can do today
          </h2>
          <ol
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: 14,
              lineHeight: 1.65,
              color: "rgba(255,255,255,0.78)",
            }}
          >
            <li style={{ marginBottom: 8 }}>
              Open StrainSpotter in your phone browser and go to the{" "}
              <Link href="/garden/scanner" style={{ color: "#A5D6A7", fontWeight: 700 }}>
                scanner
              </Link>
              .
            </li>
            <li style={{ marginBottom: 8 }}>
              For a more app-like experience, use{" "}
              <strong style={{ color: "rgba(255,255,255,0.9)" }}>Add to Home Screen</strong>{" "}
              (Safari: Share → Add to Home Screen; Android Chrome: Install app when prompted).
            </li>
            <li>
              If your team distributes an internal native build, use the install flow they
              provide—this page stays accurate for the public web experience.
            </li>
          </ol>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link
            href="/garden/scanner"
            style={{
              display: "inline-block",
              textAlign: "center",
              padding: "14px 20px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #34d399, #059669)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 15,
              textDecoration: "none",
            }}
          >
            Open web scanner
          </Link>
          <Link
            href="/garden"
            style={{
              display: "inline-block",
              textAlign: "center",
              padding: "12px 18px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.75)",
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            The Garden hub
          </Link>
        </div>

        <p
          style={{
            marginTop: 28,
            fontSize: 12,
            lineHeight: 1.55,
            color: "rgba(255,255,255,0.35)",
          }}
        >
          Scanner “StrainSpotter on your phone” links open this page until a public App Store
          or Play Store URL is configured for your deployment.
        </p>
      </div>
    </div>
  );
}
