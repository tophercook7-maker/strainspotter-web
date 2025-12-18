// lib/membership.ts

export async function getMembership() {
  const res = await fetch("/api/membership/status", { cache: "no-store" });
  if (!res.ok) return { tier: 0 }; // default
  return res.json(); // { tier, scans_left, doctor_left }
}

