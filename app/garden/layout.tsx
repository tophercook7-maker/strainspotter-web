import type { ReactNode } from "react";
import CheckoutReturn from "@/components/CheckoutReturn";
import CloudSyncAgent from "@/components/CloudSyncAgent";
import AuthProvider from "@/lib/auth/AuthProvider";

export default function GardenLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div
        className="relative min-h-screen w-full text-white"
        style={{
          backgroundImage: "url(/strainspotter-bg.jpeg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        {/* subtle dark wash for legibility — fixed so it covers scroll */}
        <div className="fixed inset-0 bg-black/35 pointer-events-none" />
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
