// lib/credits.ts

export async function checkCredits() {
  const res = await fetch("/api/credits/check", { cache: "no-store" });
  if (!res.ok) return { ok: false, credits: 0 };
  return res.json(); // { ok: true, credits: n }
}

export async function deductCredit(count = 1) {
  const res = await fetch("/api/credits/deduct", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: count }),
  });
  return res.json();
}

