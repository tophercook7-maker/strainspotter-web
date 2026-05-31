import { Suspense } from "react";
import CompareScansClient from "./CompareScansClient";

export default function CompareScansPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <p className="text-white/50 text-sm">Loading…</p>
        </div>
      }
    >
      <CompareScansClient />
    </Suspense>
  );
}
