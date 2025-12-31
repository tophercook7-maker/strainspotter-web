"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
// TEMPORARY: Auth disabled
import { MOCK_USER } from "@/lib/supabaseBrowser";

export default function ScanGatePage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<null | any>(null);

  useEffect(() => {
    async function load() {
      try {
        // TEMPORARY: Use mock user instead of real auth
        // const { data: { user } } = await supabase.auth.getUser();
        // if (!user) {
        //   setStatus({ allowed: false, message: "Please sign in to use the scanner." });
        //   setLoading(false);
        //   return;
        // }
        // const res = await fetch(`/api/scan/check?user=${user.id}`);
        
        // Mock: Always allow access
        const user = MOCK_USER;
        const res = await fetch(`/api/scan/check?user=${user.id}`);
        const data = await res.json();
        setStatus(data);
      } catch (e) {
        setStatus({ allowed: false, error: "Unable to connect to server." });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-white">
        <div className="animate-pulse text-2xl">Checking your scanner access…</div>
      </div>
    );
  }

  // If no session or not allowed
  if (!status?.allowed && !status?.error) {
    return (
      <div className="flex flex-col items-center mt-24 text-white">
        <img
          src="/brand/strainspotter-mark.png"
          alt="StrainSpotter"
          className="w-44 mb-6 drop-shadow-lg"
        />
        <h1 className="text-3xl font-bold mb-4">Sign in to use the scanner</h1>
        <Link
          href="/login"
          className="px-6 py-3 bg-green-600 rounded-full hover:bg-green-700"
        >
          Sign In
        </Link>

        <Link
          href="/scanner-demo"
          className="mt-4 text-green-300 underline"
        >
          Try Demo Scan →
        </Link>

        <Link
          href="/join"
          className="mt-2 text-yellow-300 underline"
        >
          Join the Garden →
        </Link>
      </div>
    );
  }

  // If error
  if (status?.error || status?.message?.includes("not found")) {
    return (
      <div className="text-center text-white mt-20">
        <h1 className="text-2xl mb-4">Something went wrong</h1>
        <p>{status.error || status.message}</p>
      </div>
    );
  }

  // User info
  const { scanCredits, doctorCredits, tier, allowed } = status;

  return (
    <div className="flex flex-col items-center mt-20 text-white">

      {/* Hero */}
      <img
        src="/brand/strainspotter-mark.png"
        alt="StrainSpotter"
        className="w-40 mb-6 drop-shadow-xl"
      />

      {/* Membership state */}
      <h1 className="text-4xl font-bold mb-4">
        {tier === "pro" || tier === "ultimate"
          ? `${tier === "ultimate" ? "Ultimate" : "Pro"} Member Access`
          : tier === "basic"
          ? "Garden Member Access"
          : "Scanner Access"}
      </h1>

      {/* Credit display */}
      <div className="text-xl mb-6">
        <div>Scans Remaining: <span className="text-green-300">
          {tier === "pro" || tier === "ultimate" ? "Unlimited" : scanCredits}
        </span></div>
        <div>Doctor Scans: <span className="text-green-300">{doctorCredits}</span></div>
      </div>

      {/* Scanner Buttons */}
      {allowed ? (
        <Link
          href="/scanner"
          className="px-8 py-3 bg-green-600 rounded-full text-lg hover:bg-green-700"
        >
          Enter Scanner →
        </Link>
      ) : (
        <div className="flex flex-col">
          <div className="text-red-300 mb-4 text-lg font-semibold">
            You are out of scans.
          </div>

          <Link
            href="/buy-scans"
            className="px-6 py-3 bg-yellow-500 rounded-full text-lg hover:bg-yellow-600 mb-3"
          >
            Buy More Scans
          </Link>

          <Link
            href="/join"
            className="px-6 py-3 bg-green-700 rounded-full text-lg hover:bg-green-800"
          >
            Upgrade Membership
          </Link>
        </div>
      )}

      {/* Demo option */}
      <Link
        href="/scanner-demo"
        className="mt-6 text-green-300 underline"
      >
        Try Demo Scan Instead →
      </Link>
    </div>
  );
}
