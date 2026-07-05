// lib/scanSounds.ts — synthesized, cannabis-flavored scan audio via Web Audio.
// No audio files (nothing to 404, ~0 payload). Everything is generated live:
//   • spark()   — a lighter flick (filtered noise burst) at scan start
//   • bubbles() — a soft water-pipe bubble loop while scanning
//   • chime()   — a mellow two-note chime on a finished scan
//
// Browsers block audio until a user gesture; the scan is button-triggered, so
// the first play() happens inside that gesture and unlocks the context.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let bubbleTimer: ReturnType<typeof setInterval> | null = null;
let muted = false;
const VOL = 0.5;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : VOL;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function setScanMuted(m: boolean) {
  muted = m;
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : VOL, ctx.currentTime, 0.02);
}
export function isScanMuted() {
  return muted;
}

// One bubble: a short sine "blip" that rises in pitch (the pop) through a
// lowpass so it reads warm/watery rather than beepy.
function oneBubble(c: AudioContext, when: number) {
  if (!master) return;
  const o = c.createOscillator();
  const g = c.createGain();
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 700;
  o.type = "sine";
  const f0 = 85 + Math.random() * 130;
  o.frequency.setValueAtTime(f0, when);
  o.frequency.exponentialRampToValueAtTime(f0 * 2.3, when + 0.05);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.22, when + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);
  o.connect(lp);
  lp.connect(g);
  g.connect(master);
  o.start(when);
  o.stop(when + 0.15);
}

export function spark() {
  const c = ac();
  if (!c || !master) return;
  const dur = 0.2;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    // Decaying white noise = the scratch/flick of a lighter.
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.2);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2400;
  bp.Q.value = 0.7;
  const g = c.createGain();
  g.gain.value = 0.3;
  src.connect(bp);
  bp.connect(g);
  g.connect(master);
  src.start();
}

export function startBubbles() {
  const c = ac();
  if (!c) return;
  stopBubbles();
  const tick = () => {
    if (!c || muted || !master) return;
    const n = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) oneBubble(c, c.currentTime + Math.random() * 0.18);
  };
  tick();
  bubbleTimer = setInterval(tick, 230);
}

export function stopBubbles() {
  if (bubbleTimer) {
    clearInterval(bubbleTimer);
    bubbleTimer = null;
  }
}

export function chime() {
  const c = ac();
  if (!c || !master) return;
  // Soft, mellow major third (C5 → E5) on triangle waves.
  [523.25, 659.25].forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "triangle";
    o.frequency.value = f;
    const t = c.currentTime + i * 0.12;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g);
    g.connect(master!);
    o.start(t);
    o.stop(t + 1.0);
  });
}
