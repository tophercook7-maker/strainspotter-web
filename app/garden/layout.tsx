import type { ReactNode } from "react";
import CheckoutReturn from "@/components/CheckoutReturn";
import CloudSyncAgent from "@/components/CloudSyncAgent";
import AuthProvider from "@/lib/auth/AuthProvider";

export default function GardenLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div
        className="relative min-h-screen w-full text-white"
        style={{ background: "#0a0a0a" }}
      >
        {/* new-look flat black + radial emerald glow — fixed so it covers scroll */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(80% 55% at 50% -5%, rgba(52,211,153,0.10), transparent 60%), radial-gradient(60% 40% at 100% 100%, rgba(52,211,153,0.05), transparent 55%)",
          }}
        />
        {/* Checkout return handler — auto-activates after Stripe redirect */}
        <CheckoutReturn />
        {/* Cloud sync — mirrors plants/grows/journal/favorites to Supabase */}
        <CloudSyncAgent />
        {/* content frame — relative so it sits above the overlay */}
        <div className="relative mx-auto w-full max-w-6xl px-6 py-10">
          {children}
        </div>
      </div>
    </AuthProvider>
  );
}
