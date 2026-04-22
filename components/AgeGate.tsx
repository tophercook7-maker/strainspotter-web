"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { isAgeVerified, verifyAge } from "@/lib/ageGate";

const PUBLIC_ROUTES = ["/privacy", "/terms"];

function isPublicRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route)
  );
}

export default function AgeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [verified, setVerified] = useState<boolean | null>(null);

  const bypass = useMemo(() => isPublicRoute(pathname), [pathname]);

  useEffect(() => {
    if (bypass) {
      setVerified(true);
      return;
    }

    setVerified(isAgeVerified());
  }, [bypass]);

  function confirm() {
    verifyAge();
    setVerified(true);
  }

  function leave() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "https://www.google.com";
    }
  }

  if (verified === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Loading...
      </div>
    );
  }

  if (verified) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white">
      <div className="max-w-md text-center p-6">
        <h1 className="text-2xl font-bold mb-4">18+ Only</h1>
        <p className="mb-6">
          By continuing, you confirm you are at least 18 years old.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={confirm}
            className="bg-white text-black px-4 py-2 rounded"
          >
            I am 18+
          </button>

          <button
            onClick={leave}
            className="border border-white px-4 py-2 rounded"
          >
            Leave site
          </button>
        </div>
      </div>
    </div>
  );
}
