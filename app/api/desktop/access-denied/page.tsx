"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DesktopAccessDeniedPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      try {
        const res = await fetch("/api/desktop/check-access");
        const data = await res.json();
        
        if (data.authorized) {
          setAuthorized(true);
          // Redirect to home
          router.push("/");
        } else {
          setChecking(false);
        }
      } catch (error) {
        console.error("Error checking access:", error);
        setChecking(false);
      }
    }

    checkAccess();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Checking access...</p>
        </div>
      </div>
    );
  }

  if (authorized) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md mx-auto text-center space-y-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Desktop Access Restricted</h1>
          <p className="text-white/70">
            Desktop access is currently in private testing.
          </p>
        </div>

        <div className="rounded-xl bg-white/10 backdrop-blur-lg p-6 border border-white/20">
          <p className="text-white/90 mb-4">
            The StrainSpotter desktop app is available to a limited group of testers during this early phase.
          </p>
          <p className="text-sm text-white/70">
            If you believe you should have access, please contact support through the web app.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-center"
          >
            Continue to Web App
          </Link>
          <Link
            href="/login"
            className="block w-full px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/15 transition text-center text-sm"
          >
            Sign In with Different Account
          </Link>
        </div>

        <p className="text-xs text-white/50 mt-6">
          StrainSpotter — Early Test Build
        </p>
      </div>
    </div>
  );
}
