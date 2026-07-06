"use client";

// StrainSpotterLanding — the interactive landing: unified one-scan (Strain +
// Health tabs), count-up stats, moving honesty graph, springy buttons, scroll
// reveals, video backgrounds. Inline styles + keyframes in globals.css.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import AddToHomeScreen from "@/components/AddToHomeScreen";

const G = "#34d399", G2 = "#6ee7b7", LIME = "#a3e635", AMBER = "#fbbf24";
const spring = "cubic-bezier(.34,1.56,.64,1)";

function spr(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget; el.style.animation = "none"; void el.offsetWidth;
  el.style.animation = "ss-spring .5s " + spring;
}

function Reveal({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  const r = useRef<HTMLDivElement>(null);
  const [inv, setInv] = useState(false);
  useEffect(() => {
    const el = r.current; if (!el) return;
    const io = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { setInv(true); io.disconnect(); } }), { threshold: 0.25 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <div ref={r} style={{ opacity: inv ? 1 : 0, transform: inv ? "none" : "translateY(26px)", transition: `opacity .7s ease, transform .7s ${spring}`, ...style }}>{children}</div>;
}

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const r = useRef<HTMLElement>(null); const [n, setN] = useState(0);
  useEffect(() => {
    const el = r.current; if (!el) return;
    const io = new IntersectionObserver((es) => es.forEach((x) => {
      if (x.isIntersecting) { io.disconnect(); let v = 0; const step = Math.max(1, Math.round(to / 34));
        const t = setInterval(() => { v += step; if (v >= to) { v = to; clearInterval(t); } setN(v); }, 26); }
    }), { threshold: 0.5 });
    io.observe(el); return () => io.disconnect();
  }, [to]);
  return <b ref={r} style={{ fontSize: 40, fontWeight: 800, color: G2, letterSpacing: "-.02em", display: "block" }}>{n}{suffix}</b>;
}

const CAND = [{ n: "Blue Dream", c: 84, col: G }, { n: "Super Silver Haze", c: 57, col: LIME }, { n: "OG Kush", c: 33, col: AMBER }];
const btnG: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 14, padding: "14px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer", border: "none", background: G, color: "#0a0a0a", textDecoration: "none", transition: `transform .18s ${spring}` };
const btnO: CSSProperties = { ...btnG, background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,.22)" };
const chip: CSSProperties = { borderRadius: 6, background: "rgba(255,255,255,.08)", padding: "4px 8px", fontSize: 11, color: "rgba(255,255,255,.72)" };

export default function StrainSpotterLanding() {
  type Phase = "scanning" | "analyzing" | "done";
  const [phase, setPhase] = useState<Phase>("scanning");
  const [tab, setTab] = useState<"strain" | "health">("strain");
  const [run, setRun] = useState(0);
  const [barW, setBarW] = useState(false);
  const [ringOff, setRingOff] = useState(138);

  useEffect(() => {
    setPhase("scanning"); setBarW(false);
    const t1 = setTimeout(() => setPhase("analyzing"), 2100);
    const t2 = setTimeout(() => { setPhase("done"); setTab("strain"); setTimeout(() => setBarW(true), 80); }, 3300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [run]);
  useEffect(() => { if (tab === "health" && phase === "done") { setRingOff(138); setTimeout(() => setRingOff(138 - 138 * 0.78), 60); } }, [tab, phase]);

  const corner = (p: CSSProperties): CSSProperties => ({ position: "absolute", height: 26, width: 26, borderColor: "rgba(110,231,183,.85)", ...p });

  return (
    <div style={{ background: "#0a0a0a", color: "#fff", fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,sans-serif", overflowX: "hidden" }}>
      {/* nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(14px)", background: "rgba(10,10,10,.6)", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 22px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 800, fontSize: 19, letterSpacing: "-.02em" }}>Strain<span style={{ color: G }}>Spotter</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="ssl-install-nav"><AddToHomeScreen variant="outline" label="📲 Install" /></span>
            <Link href="/garden/scanner" style={btnG} onClick={spr}>Open scanner →</Link>
          </div>
        </div>
      </nav>

      {/* hero + unified scanner */}
      <section style={{ padding: "70px 22px 92px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 340px", gap: 56, alignItems: "center" }} className="ssl-grid2">
          <Reveal>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.05)", padding: "6px 13px", fontSize: 12.5, fontWeight: 500, color: G2 }}>
              <span style={{ height: 6, width: 6, borderRadius: 999, background: G, animation: "ss-float 2s ease-in-out infinite" }} /> One scan · strain + health
            </span>
            <h1 style={{ marginTop: 16, fontSize: 52, lineHeight: 1.05, fontWeight: 800, letterSpacing: "-.02em" }}>Read the label.<br />Read the plant.</h1>
            <p style={{ marginTop: 14, color: "rgba(255,255,255,.66)", fontSize: 17, lineHeight: 1.55, maxWidth: 470 }}>Show a <b>label</b> and we read the strain name off it. Show the <b>plant</b> and our Grow Doctor reads its health — stage, stress, deficiencies. Two reliable answers in one scan, with <b>calibrated confidence</b> and never a fake guess.</p>
            <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/garden/scanner" style={btnG} onClick={spr}>Scan your plant →</Link>
              <button style={btnO} onClick={(e) => { spr(e); setRun((n) => n + 1); }}>↻ Replay scan</button>
            </div>
          </Reveal>

          <Reveal style={{ justifySelf: "center" }}>
            <div style={{ position: "relative", width: 320, aspectRatio: "9/16", overflow: "hidden", borderRadius: 30, border: "1px solid rgba(255,255,255,.1)", background: "#000", boxShadow: "0 40px 80px -24px rgba(0,0,0,.85)" }}>
              <video key={run} src="/videos/strain_bud.mp4" autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, height: "100%", width: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,.75),transparent 45%,rgba(0,0,0,.3))" }} />
              <div style={{ position: "absolute", inset: 24, pointerEvents: "none" }}>
                <span style={corner({ left: 0, top: 0, borderLeft: "2px solid", borderTop: "2px solid" })} />
                <span style={corner({ right: 0, top: 0, borderRight: "2px solid", borderTop: "2px solid" })} />
                <span style={corner({ left: 0, bottom: 0, borderLeft: "2px solid", borderBottom: "2px solid" })} />
                <span style={corner({ right: 0, bottom: 0, borderRight: "2px solid", borderBottom: "2px solid" })} />
              </div>
              {phase === "scanning" && <div key={run} className="ss-scanline" style={{ position: "absolute", left: 0, right: 0, height: 3, background: G2, boxShadow: "0 0 18px 4px rgba(52,211,153,.7)" }} />}
              <div style={{ position: "absolute", left: "50%", top: 18, transform: "translateX(-50%)", borderRadius: 999, background: "rgba(0,0,0,.6)", padding: "5px 12px", fontSize: 11, fontWeight: 600, backdropFilter: "blur(6px)" }}>
                {phase === "scanning" && <span style={{ color: G2 }}>◦ Scanning…</span>}
                {phase === "analyzing" && <span style={{ color: "#bef264" }}>◦ Weighing evidence…</span>}
                {phase === "done" && <span style={{ color: "rgba(255,255,255,.85)" }}>✓ Strain + health</span>}
              </div>
              {phase === "done" && (
                <div style={{ position: "absolute", left: 12, right: 12, bottom: 12, borderRadius: 16, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.08)", backdropFilter: "blur(18px)", padding: 14, animation: "ss-fadeup .5s ease both" }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                    {(["strain", "health"] as const).map((t) => (
                      <button key={t} onClick={(e) => { spr(e); setTab(t); }} style={{ borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${tab === t ? "rgba(52,211,153,.45)" : "rgba(255,255,255,.15)"}`, background: tab === t ? "rgba(52,211,153,.18)" : "rgba(255,255,255,.06)", color: tab === t ? G2 : "rgba(255,255,255,.7)", transition: `transform .18s ${spring}` }}>
                        {t === "strain" ? "🌿 Strain" : "❤️ Health"}
                      </button>
                    ))}
                    <span style={{ marginLeft: "auto", fontSize: 10, color: G2, alignSelf: "center" }}>1 scan</span>
                  </div>
                  {tab === "strain" ? (
                    <div>
                      {CAND.map((c) => (
                        <div key={c.n} style={{ marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}><span style={{ fontWeight: 500 }}>{c.n}</span><span style={{ color: "rgba(255,255,255,.7)" }}>{c.c}%</span></div>
                          <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
                            <span style={{ display: "block", height: "100%", borderRadius: 999, width: barW ? `${c.c}%` : "0%", background: c.col, transition: `width 1s ${spring}` }} />
                          </div>
                        </div>
                      ))}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}><span style={chip}>Trichomes: cloudy</span><span style={chip}>Pistils: amber</span></div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                        <svg width="52" height="52" style={{ transform: "rotate(-90deg)" }}><circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="6" /><circle cx="26" cy="26" r="22" fill="none" stroke={AMBER} strokeWidth="6" strokeLinecap="round" strokeDasharray="138" strokeDashoffset={ringOff} style={{ transition: `stroke-dashoffset 1s ${spring}` }} /></svg>
                        <div><div style={{ fontWeight: 700, fontSize: 15 }}>Nitrogen deficiency</div><div style={{ fontSize: 12, color: "rgba(255,255,255,.55)" }}>78% likely · early stage</div></div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}><span style={chip}>Fix: feed N · cal-mag</span><span style={chip}>Yellowing: lower leaves</span></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* stats */}
      <section style={{ padding: "20px 22px 60px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }} className="ssl-stats">
          {[{ to: 314, s: "", l: "cultivars in catalog" }, { to: 0, s: "%", l: "inflated confidence floor" }, { to: 5, s: "", l: "honest candidates, not 1" }, { to: 60, s: "s", l: "from photo to answer" }].map((x, i) => (
            <Reveal key={i}><div style={{ border: "1px solid rgba(255,255,255,.09)", borderRadius: 18, padding: 22, background: "rgba(255,255,255,.03)" }}><CountUp to={x.to} suffix={x.s} /><span style={{ color: "rgba(255,255,255,.55)", fontSize: 13.5 }}>{x.l}</span></div></Reveal>
          ))}
        </div>
      </section>

      {/* honesty graph */}
      <section style={{ padding: "92px 22px", background: "radial-gradient(70% 60% at 50% 0%,rgba(52,211,153,.08),transparent)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <Reveal><h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.08 }}>Most apps fake it.<br />We don&rsquo;t.</h2>
            <p style={{ color: "rgba(255,255,255,.66)", fontSize: 17, marginTop: 14, maxWidth: 520 }}>Point a &ldquo;strain ID&rdquo; app at a leaf and it&rsquo;ll still confidently name a strain. Watch what honest calibration looks like on the same unlabeled photo.</p></Reveal>
          <Reveal style={{ marginTop: 36 }}>
            <Cmp label="Other apps" pct={97} color="linear-gradient(90deg,#ef4444,#f97316)" num="97%" numColor="#f87171" />
            <Cmp label="StrainSpotter" pct={41} color={`linear-gradient(90deg,${G},${G2})`} num="41%" numColor={G2} />
          </Reveal>
        </div>
      </section>

      {/* grow doctor */}
      <section style={{ padding: "92px 22px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 340px", gap: 56, alignItems: "center" }} className="ssl-grid2">
          <Reveal>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.05)", padding: "6px 13px", fontSize: 12.5, fontWeight: 500, color: G2 }}><span style={{ height: 6, width: 6, borderRadius: 999, background: G, animation: "ss-float 2s ease-in-out infinite" }} /> Included in every scan</span>
            <h2 style={{ marginTop: 16, fontSize: 38, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.08 }}>The health check<br />comes free with the ID.</h2>
            <p style={{ color: "rgba(255,255,255,.66)", fontSize: 17, marginTop: 14, maxWidth: 440 }}>The <b>same scan</b> that names the strain also reads the plant&rsquo;s health — yellowing, deficiencies, early stress — with a calibrated diagnosis and a real fix. No second photo.</p>
            <Link href="/garden/scanner" style={{ ...btnG, marginTop: 26 }} onClick={spr}>Try the scanner →</Link>
          </Reveal>
          <Reveal style={{ justifySelf: "center" }}>
            <div style={{ position: "relative", width: 320, aspectRatio: "9/16", overflow: "hidden", borderRadius: 30, border: "1px solid rgba(255,255,255,.1)", background: "#000", boxShadow: "0 40px 80px -24px rgba(0,0,0,.85)" }}>
              <video src="/videos/strain_leaf.mp4" autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, height: "100%", width: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,.7),transparent 50%)" }} />
            </div>
          </Reveal>
        </div>
      </section>

      <footer style={{ padding: "70px 22px", borderTop: "1px solid rgba(255,255,255,.06)", textAlign: "center", color: "rgba(255,255,255,.5)" }}>
        <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 10 }}>Strain<span style={{ color: G }}>Spotter</span></div>
        <p style={{ marginBottom: 20 }}>The cannabis companion built for honesty.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/garden/scanner" style={btnG} onClick={spr}>Start scanning free →</Link>
          <AddToHomeScreen variant="outline" label="📲 Add to Home Screen" />
        </div>
        <p style={{ marginTop: 26, fontSize: 12 }}>Intended for use where cannabis is legal. Always follow your local laws.</p>
      </footer>

      <style>{`@media(max-width:900px){.ssl-grid2{grid-template-columns:1fr!important;justify-items:center;text-align:center}.ssl-stats{grid-template-columns:1fr 1fr!important}}@media(max-width:560px){.ssl-install-nav{display:none}}`}</style>
    </div>
  );
}

function Cmp({ label, pct, color, num, numColor }: { label: string; pct: number; color: string; num: string; numColor: string }) {
  const r = useRef<HTMLDivElement>(null); const [w, setW] = useState(0);
  useEffect(() => {
    const el = r.current; if (!el) return;
    const io = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { io.disconnect(); setTimeout(() => setW(pct), 120); } }), { threshold: 0.4 });
    io.observe(el); return () => io.disconnect();
  }, [pct]);
  return (
    <div ref={r} style={{ display: "grid", gridTemplateColumns: "130px 1fr 54px", alignItems: "center", gap: 14, marginBottom: 16, maxWidth: 560 }}>
      <span style={{ fontSize: 14, color: "rgba(255,255,255,.75)" }}>{label}</span>
      <div style={{ height: 26, borderRadius: 8, background: "rgba(255,255,255,.07)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${w}%`, borderRadius: 8, background: color, transition: "width 1.2s cubic-bezier(.34,1.56,.64,1)" }} /></div>
      <span style={{ fontSize: 14, color: numColor }}>{num}</span>
    </div>
  );
}
