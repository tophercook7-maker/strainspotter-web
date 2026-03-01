"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function setAgeCookie() {
  // 1 year
  const maxAgeSeconds = 60 * 60 * 24 * 365;
  document.cookie = `ss_age_ok=1; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

function hasAgeCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.includes("ss_age_ok=1");
}

export default function AgeGateClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (hasAgeCookie()) {
      router.replace("/home");
      return;
    }
    setChecking(false);
  }, [router]);

  if (checking) {
    return <div className="text-sm text-white/60">Checking…</div>;
  }

  function handleAccept() {
    setLoading(true);
    setAgeCookie();
    router.replace("/home");
  }

  function handleDecline() {
    // Simple: send them to a neutral page
    window.location.href = "https://www.google.com";
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        disabled={loading}
        onClick={handleAccept}
        className="inline-flex items-center justify-center rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-500 transition-colors disabled:opacity-60"
      >
        {loading ? "Entering…" : "I am 21+ — Enter"}
      </button>

      <button
        type="button"
        disabled={loading}
        onClick={handleDecline}
        className="inline-flex items-center justify-center rounded-xl bg-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/25 transition-colors disabled:opacity-60"
      >
        I am not 21
      </button>
    </div>
  );
}
