"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useMembership } from "@/lib/hooks/useMembership";

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { membership, loading: membershipLoading } = useMembership();

  const handleEnterGarden = () => {
    // If loading states → do nothing
    if (authLoading || membershipLoading) {
      return;
    }

    // If !user → router.push("/auth/login")
    if (!user) {
      router.push("/auth/login");
      return;
    }

    // If user && membership !== "active" → router.push("/account")
    // Membership tier 'garden' or 'pro' is considered "active" for Garden access
    // Check if membership exists and is not 'free'
    if (!membership || membership.tier === 'free') {
      router.push("/account");
      return;
    }

    // If user && membership === "active" → router.push("/garden")
    router.push("/garden");
  };

  const handleScanner = () => {
    // Scanner requires auth but not membership
    if (authLoading) {
      return;
    }

    if (!user) {
      router.push("/auth/login");
      return;
    }

    router.push("/scanner");
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/brand/strainspotter-hero.png')",
        }}
      />

      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        {/* Hero Image */}
        <div className="mb-12">
          <img 
            src="/brand/strainspotter-hero.png" 
            alt="StrainSpotter" 
            className="max-w-md mx-auto w-full h-auto"
          />
        </div>

        {/* Two Buttons */}
        <div className="flex flex-col gap-4 max-w-xs mx-auto">
          <button
            onClick={handleEnterGarden}
            disabled={authLoading || membershipLoading}
            className="px-8 py-4 bg-emerald-600 text-black font-bold text-lg rounded-lg hover:bg-emerald-500 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ENTER GARDEN
          </button>
          
          <button
            onClick={handleScanner}
            disabled={authLoading}
            className="px-8 py-4 bg-emerald-600 text-black font-bold text-lg rounded-lg hover:bg-emerald-500 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            SCANNER
          </button>
        </div>

        {/* Small legal note */}
        <p className="mt-8 text-xs text-white/60">
          You must be 21+ to use this service
        </p>
      </div>
    </div>
  );
}
