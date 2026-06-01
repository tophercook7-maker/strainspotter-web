"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { getSupabase } from "../supabase/client";
import type { MembershipTier } from "@/lib/auth/effectiveTier";
import type { ScanEntitlements } from "@/lib/scanner/scanEntitlements";
import type { User, Session } from "@supabase/supabase-js";
import { membershipToTier } from "@/lib/billing/membership";

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
  needsOnboarding: boolean;
  tier: "free" | "member" | "pro";
  /**
   * Optional entitlements/membership fields supplied by the data-engine line.
   * Consumers (e.g. useMembershipPlan) read these defensively with fallbacks,
   * so they are optional until the provider is wired to populate them.
   */
  effectiveMembershipTier?: MembershipTier;
  membershipPlanTier?: MembershipTier;
  entitlementsStatus?: "idle" | "loading" | "ok" | "error";
  scanEntitlements?: ScanEntitlements | null;
  refreshScanEntitlements?: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Persist display_name on the new user's profile row. The Supabase
 * auth-create-profile trigger fires asynchronously, so the row may
 * not exist for the first few hundred ms after signUp. Retry a small
 * number of times with brief backoff. Non-blocking: caller fires
 * and forgets via `void persistDisplayName(...)`.
 */
async function persistDisplayName(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
  displayName: string
): Promise<void> {
  const MAX_ATTEMPTS = 6;
  const BACKOFF_MS = 250;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", userId)
      .select("id");
    // `data` is an array of updated rows; non-empty means the trigger
    // had already created the row and we successfully wrote display_name.
    if (!error && Array.isArray(data) && data.length > 0) return;
    // Either the row doesn't exist yet (trigger not fired) or a transient
    // error. Wait and retry; bail silently after MAX_ATTEMPTS so the user
    // signup flow never fails on this side-effect.
    await new Promise((res) => setTimeout(res, BACKOFF_MS));
  }
  console.warn(
    `[auth] display_name persist failed after ${MAX_ATTEMPTS} attempts ` +
      `for user ${userId}`
  );
}

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

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await fetchProfile(user.id);
      if (p) setProfile(p);
    }
  }, [user, fetchProfile]);

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

          // Sync tier to localStorage for components that still use it.
          // Canonical helper: elite (founder) collapses to "pro" — earlier
          // code mapped it to "member" which capped founders at the
          // Member tier rate-limit.
          if (p) {
            localStorage.setItem(
              "ss_membership_tier",
              membershipToTier(p.membership)
            );
          }
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
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        const p = await fetchProfile(newSession.user.id);
        setProfile(p);

        // Sync tier to localStorage via the canonical helper.
        if (p) {
          localStorage.setItem(
            "ss_membership_tier",
            membershipToTier(p.membership)
          );
        }
      } else {
        setProfile(null);
        localStorage.removeItem("ss_membership_tier");
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  // Sign up
  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });
    if (error) return { error: error.message };

    // Persist the display_name on profiles once the row exists. The
    // Supabase auth signUp returns the new user directly — we use that
    // id rather than rely on a setTimeout race against the create-profile
    // trigger. Retry a few times in case the trigger hasn't fired yet
    // (it's typically <100ms, but cold trigger paths can lag).
    const newUserId = data.user?.id;
    if (newUserId && displayName) {
      void persistDisplayName(supabase, newUserId, displayName);
    }

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
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    localStorage.removeItem("ss_membership_tier");
    localStorage.removeItem("ss_member_info");
  };

  // Derived state
  const needsOnboarding = !!user && !!profile && !profile.onboarding_completed;

  const tier: "free" | "member" | "pro" =
    profile?.membership === "pro"
      ? "pro"
      : profile?.membership === "garden" ||
        profile?.membership === "standard" ||
        profile?.membership === "elite"
      ? "member"
      : "free";

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
        needsOnboarding,
        tier,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
