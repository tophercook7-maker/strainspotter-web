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
import type { User, Session } from "@supabase/supabase-js";

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
  tier: "free" | "member" | "pro";
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

  const syncTierToLocalStorage = useCallback((p: Profile) => {
    const tier =
      p.membership === "pro"
        ? "pro"
        : p.membership === "garden" ||
            p.membership === "standard" ||
            p.membership === "elite"
          ? "member"
          : "free";
    localStorage.setItem("ss_membership_tier", tier);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await fetchProfile(user.id);
      if (p) {
        setProfile(p);
        syncTierToLocalStorage(p);
      }
    }
  }, [user, fetchProfile, syncTierToLocalStorage]);

  const refreshProfileByUserId = useCallback(
    async (userId: string) => {
      if (!userId) return;
      const p = await fetchProfile(userId);
      if (p) {
        setProfile(p);
        syncTierToLocalStorage(p);
      }
    },
    [fetchProfile, syncTierToLocalStorage]
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
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        const p = await fetchProfile(newSession.user.id);
        setProfile(p);

        if (p) syncTierToLocalStorage(p);
      } else {
        setProfile(null);
        localStorage.removeItem("ss_membership_tier");
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
        refreshProfileByUserId,
        needsOnboarding,
        tier,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
