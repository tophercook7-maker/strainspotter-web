"use client";

// AddToHomeScreen — a reliable, always-visible install button.
//
// The old InstallBanner only appeared when Chrome's beforeinstallprompt
// heuristics fired (or an iOS tip), so most visitors never saw an install
// option at all. This button is ALWAYS shown (until the app is already
// installed) and does the right thing per platform:
//   • Android/Chrome/Edge (prompt captured) → fire the native install prompt
//   • iOS Safari                            → show Share → Add to Home Screen
//   • Desktop / anything else               → show browser-menu instructions
//
// Inline styles so it renders regardless of Tailwind JIT state.

import { useEffect, useState, type CSSProperties } from "react";

const G = "#34d399", G2 = "#6ee7b7";
const spring = "cubic-bezier(.34,1.56,.64,1)";

export default function AddToHomeScreen({
  variant = "solid",
  label = "📲 Add to Home Screen",
}: {
  variant?: "solid" | "outline";
  label?: string;
}) {
  const [deferred, setDeferred] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    // Hide entirely once the app runs as an installed PWA.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    if (standalone) { setInstalled(true); return; }

    const ua = navigator.userAgent || "";
    const isIOS = /iphone|ipad|ipod/i.test(ua) ||
      // iPadOS 13+ reports as Mac but is touch-capable
      (/Macintosh/.test(ua) && "ontouchend" in document);
    const isAndroid = /android/i.test(ua);
    setPlatform(isIOS ? "ios" : isAndroid ? "android" : "desktop");

    const onPrompt = (e: any) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => { setInstalled(true); setShowHelp(false); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const onClick = async () => {
    if (deferred) {
      deferred.prompt();
      try {
        const { outcome } = await deferred.userChoice;
        if (outcome === "accepted") setInstalled(true);
      } catch { /* user dismissed */ }
      setDeferred(null);
      return;
    }
    // No native prompt available → show platform instructions.
    setShowHelp(true);
  };

  const base: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 14,
    padding: "12px 20px", fontSize: 14.5, fontWeight: 700, cursor: "pointer",
    textDecoration: "none", transition: `transform .18s ${spring}`,
    border: "none", fontFamily: "inherit",
  };
  const solid: CSSProperties = { ...base, background: G, color: "#04120b" };
  const outline: CSSProperties = {
    ...base, background: "rgba(255,255,255,.05)", color: "#fff",
    border: "1px solid rgba(255,255,255,.22)",
  };

  return (
    <>
      <button
        onClick={onClick}
        onMouseDown={(e) => {
          const el = e.currentTarget;
          el.style.animation = "none"; void el.offsetWidth;
          el.style.animation = `ss-spring .5s ${spring}`;
        }}
        style={variant === "solid" ? solid : outline}
      >
        {label}
      </button>

      {showHelp && (
        <div
          onClick={() => setShowHelp(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 300, display: "grid", placeItems: "center",
            background: "rgba(4,8,5,0.72)", backdropFilter: "blur(6px)", padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 360, maxWidth: "94vw", borderRadius: 20, padding: "22px 22px 20px",
              background: "#101512", border: "1px solid rgba(52,211,153,0.28)",
              boxShadow: "0 30px 80px -20px rgba(0,0,0,0.85)", color: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 26 }}>📲</span>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em" }}>
                Install Strain<span style={{ color: G }}>Spotter</span>
              </div>
            </div>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.5, margin: "0 0 16px" }}>
              Add it to your home screen for one-tap scanning and a full-screen, app-like feel.
            </p>

            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
              {(platform === "ios"
                ? [
                    <>Tap the <strong style={s}>Share</strong> icon <span style={{ opacity: 0.8 }}>(the square with an up-arrow)</span> in the toolbar.</>,
                    <>Scroll down and tap <strong style={s}>Add to Home Screen</strong>.</>,
                    <>Tap <strong style={s}>Add</strong> — StrainSpotter lands on your home screen.</>,
                  ]
                : platform === "android"
                ? [
                    <>Open the browser menu <strong style={s}>⋮</strong> (top-right).</>,
                    <>Tap <strong style={s}>Install app</strong> or <strong style={s}>Add to Home screen</strong>.</>,
                    <>Confirm — StrainSpotter installs like a native app.</>,
                  ]
                : [
                    <>Look for the <strong style={s}>install icon</strong> in the address bar <span style={{ opacity: 0.8 }}>(a monitor/⊕ symbol)</span>.</>,
                    <>Or open the browser menu and choose <strong style={s}>Install StrainSpotter</strong>.</>,
                    <>Confirm to add it to your desktop / apps.</>,
                  ]
              ).map((step, i) => (
                <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{
                    flexShrink: 0, width: 24, height: 24, borderRadius: "50%", display: "grid", placeItems: "center",
                    background: "rgba(52,211,153,0.16)", border: "1px solid rgba(52,211,153,0.4)",
                    color: G2, fontSize: 12, fontWeight: 800,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "rgba(255,255,255,0.85)", paddingTop: 2 }}>{step}</span>
                </li>
              ))}
            </ol>

            <button
              onClick={() => setShowHelp(false)}
              style={{
                marginTop: 20, width: "100%", padding: "11px 0", borderRadius: 12, border: "none",
                background: G, color: "#04120b", fontWeight: 800, fontSize: 14, cursor: "pointer",
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const s: CSSProperties = { color: "#6ee7b7", fontWeight: 700 };
