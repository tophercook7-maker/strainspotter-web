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

  useEffect(() => {
    // Initial user fetch
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
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
    console.log("[AUTH]", { user: user?.email ?? null });
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
