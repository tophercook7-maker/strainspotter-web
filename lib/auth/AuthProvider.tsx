"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { getSupabase } from "../supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { ScanEntitlements } from "@/lib/scanner/scanEntitlements";
import { fetchScanEntitlements } from "@/lib/scanGating";
import type { MembershipTier } from "./effectiveTier";
import {
  clearCheckoutPromotionFlags,
  isCheckoutPromotionActive,
  readStoredMembershipTier,
  resolveEffectiveTier,
} from "./effectiveTier";

interface Profile {
  id: string;
  membership: "free" | "garden" | "pro" | "elite" | "standard";
  display_name: string | null;
  user_type: string | null;
  experience_level: string | null;
  interests: string[] | null;
  location_text: string | null;
  moderator_interest: boolean;
  onboarding_completed: boolean;
  scans_remaining: number;
  is_owner: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ error: string | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Re-fetch profile by id (e.g. right after sign-in before `user` state updates). */
  refreshProfileByUserId: (userId: string) => Promise<void>;
  needsOnboarding: boolean;
  /** Tier from `profiles.membership` only (no localStorage / checkout reconciliation). */
  tier: "free" | "member" | "pro";
  /** Checkout + localStorage + profile reconciliation (transitional UI / fallback). */
  effectiveMembershipTier: MembershipTier;
  /**
   * Prefer server scan entitlements when loaded; otherwise `effectiveMembershipTier`.
   * Use for badges, MemberGate, and scanner-adjacent plan labels.
   */
  membershipPlanTier: MembershipTier;
  entitlementsStatus: "idle" | "loading" | "ok" | "error";
  scanEntitlements: ScanEntitlements | null;
  /** Re-fetch entitlements after a scan consume; ignores failures (keeps prior state). */
  refreshScanEntitlements: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

/**
 * Optional hook — returns null if no AuthProvider above.
 * Useful for components that work with or without auth.
 */
export function useOptionalAuth() {
  return useContext(AuthContext);
}

function safeSetLocalStorage(key: string, value: string): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function safeRemoveLocalStorage(key: string): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanEntitlements, setScanEntitlements] = useState<ScanEntitlements | null>(
    null
  );
  const [entitlementsStatus, setEntitlementsStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");

  const supabase = getSupabase();

  // Fetch profile from Supabase
  const fetchProfile = useCallback(
    async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) {
          console.warn("Profile fetch error:", error.message);
          return null;
        }
        return data as Profile;
      } catch {
        return null;
      }
    },
    [supabase]
  );

  /**
   * Keeps `ss_membership_tier` aligned with `profiles.membership`, except during the short
   * post-checkout window where localStorage may still show paid while the row reads `free`.
   */
  const syncTierToLocalStorage = useCallback((p: Profile) => {
    const derived: MembershipTier =
      p.membership === "pro"
        ? "pro"
        : p.membership === "garden" ||
            p.membership === "standard" ||
            p.membership === "elite"
          ? "member"
          : "free";
    const stored = readStoredMembershipTier();
    if (derived === "free" && (stored === "member" || stored === "pro")) {
      if (isCheckoutPromotionActive()) return;
      clearCheckoutPromotionFlags();
      safeSetLocalStorage("ss_membership_tier", "free");
      return;
    }
    safeSetLocalStorage("ss_membership_tier", derived);
    if (derived === "member" || derived === "pro") {
      clearCheckoutPromotionFlags();
    }
  }, []);

  const applyEntitlementsFetch = useCallback(
    (
      r:
        | { ok: true; entitlements: ScanEntitlements }
        | { ok: false; error: string },
      strict: boolean
    ) => {
      if (r.ok) {
        setScanEntitlements(r.entitlements);
        setEntitlementsStatus("ok");
      } else if (strict) {
        setScanEntitlements(null);
        setEntitlementsStatus("error");
      }
    },
    []
  );

  const refreshScanEntitlements = useCallback(async () => {
    const token = session?.access_token;
    if (!token) return;
    try {
      const r = await fetchScanEntitlements(token);
      applyEntitlementsFetch(r, false);
    } catch (error) {
      console.warn("Scan entitlement refresh failed:", error);
    }
  }, [session?.access_token, applyEntitlementsFetch]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await fetchProfile(user.id);
      if (p) {
        setProfile(p);
        syncTierToLocalStorage(p);
        void refreshScanEntitlements();
      }
    }
  }, [user, fetchProfile, syncTierToLocalStorage, refreshScanEntitlements]);

  const refreshProfileByUserId = useCallback(
    async (userId: string) => {
      if (!userId) return;
      const p = await fetchProfile(userId);
      if (p) {
        setProfile(p);
        syncTierToLocalStorage(p);
        void refreshScanEntitlements();
      }
    },
    [fetchProfile, syncTierToLocalStorage, refreshScanEntitlements]
  );

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (currentSession?.user) {
          setUser(currentSession.user);
          setSession(currentSession);
          const p = await fetchProfile(currentSession.user.id);
          setProfile(p);

          if (p) syncTierToLocalStorage(p);
        }
      } catch (err) {
        console.warn("Auth init error:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      try {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          const p = await fetchProfile(newSession.user.id);
          setProfile(p);

          if (p) syncTierToLocalStorage(p);
          return;
        }
        setProfile(null);
        clearCheckoutPromotionFlags();
        safeRemoveLocalStorage("ss_membership_tier");
        setScanEntitlements(null);
        setEntitlementsStatus("idle");
      } catch (error) {
        console.warn("Auth state change handling failed:", error);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile, syncTierToLocalStorage]);

  // Sign up
  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });
    if (error) return { error: error.message };

    // Update profile with display name after trigger creates it
    // Small delay to let the trigger fire
    setTimeout(async () => {
      const {
        data: { user: newUser },
      } = await supabase.auth.getUser();
      if (newUser) {
        await supabase
          .from("profiles")
          .update({ display_name: displayName })
          .eq("id", newUser.id);
      }
    }, 1000);

    return { error: null };
  };

  // Sign in
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn("Sign out error:", error);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setScanEntitlements(null);
      setEntitlementsStatus("idle");
      clearCheckoutPromotionFlags();
      safeRemoveLocalStorage("ss_membership_tier");
      safeRemoveLocalStorage("ss_member_info");
    }
  };

  useEffect(() => {
    const token = session?.access_token;
    if (!token) {
      setScanEntitlements(null);
      setEntitlementsStatus("idle");
      return;
    }
    let cancelled = false;
    setEntitlementsStatus("loading");
    (async () => {
      try {
        const r = await fetchScanEntitlements(token);
        if (cancelled) return;
        applyEntitlementsFetch(r, true);
      } catch (error) {
        if (cancelled) return;
        console.warn("Scan entitlements load failed:", error);
        setScanEntitlements(null);
        setEntitlementsStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token, applyEntitlementsFetch]);

  // Derived state
  const needsOnboarding = !!user && !!profile && !profile.onboarding_completed;

  const tier: "free" | "member" | "pro" = useMemo(
    () =>
      profile?.membership === "pro"
        ? "pro"
        : profile?.membership === "garden" ||
            profile?.membership === "standard" ||
            profile?.membership === "elite"
          ? "member"
          : "free",
    [profile]
  );

  const effectiveMembershipTier = useMemo(
    () =>
      resolveEffectiveTier({
        user,
        profile,
        loading,
        tier,
      }),
    [user, profile, loading, tier]
  );

  const membershipPlanTier = useMemo(() => {
    if (user && entitlementsStatus === "ok" && scanEntitlements) {
      return scanEntitlements.tier;
    }
    return effectiveMembershipTier;
  }, [user, entitlementsStatus, scanEntitlements, effectiveMembershipTier]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!user || entitlementsStatus !== "ok" || !scanEntitlements) return;
    if (effectiveMembershipTier !== scanEntitlements.tier) {
      console.debug("[membership] effectiveTier vs server entitlements", {
        effective: effectiveMembershipTier,
        server: scanEntitlements.tier,
      });
    }
  }, [user, entitlementsStatus, scanEntitlements, effectiveMembershipTier]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        refreshProfileByUserId,
        needsOnboarding,
        tier,
        effectiveMembershipTier,
        membershipPlanTier,
        entitlementsStatus,
        scanEntitlements,
        refreshScanEntitlements,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
