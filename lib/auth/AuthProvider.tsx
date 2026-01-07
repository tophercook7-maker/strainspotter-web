"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isTauri = typeof window !== "undefined" && "__TAURI_IPC__" in window;

  useEffect(() => {
    console.log("[AUTH:init]", { isTauri, ua: typeof navigator !== "undefined" ? navigator.userAgent : "server" });
    // Initial user fetch
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
      console.log("[AUTH:init:done]", { isTauri, user: data.user?.email ?? null });
    });

    // COMMENTED OUT: onAuthStateChange causes rerender loops during login
    // Use hard redirects in login forms instead
    // const { data: listener } = supabase.auth.onAuthStateChange(
    //   (_event, session) => {
    //     setUser(session?.user ?? null);
    //   }
    // );

    // return () => {
    //   listener.subscription.unsubscribe();
    // };
  }, []);

  // Debug: Track auth state changes
  useEffect(() => {
    console.log("[AUTH:update]", { isTauri, user: user?.email ?? null, loading });
  }, [user, loading, isTauri]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
