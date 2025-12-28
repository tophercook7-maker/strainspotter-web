"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { SearchIcon } from "../icons/SearchIcon";
import { supabase } from "@/lib/supabase";
import BottomTabBar from "./BottomTabBar";

// Top-level navigation items only
const topLevelNavItems = [
  { label: "Home", href: "/", icon: "🏠" },
  { label: "Garden", href: "/garden", icon: "🌿" },
  { label: "Scan", href: "/scanner", icon: "🔍" },
  { label: "Community", href: "/community", icon: "👥" },
  { label: "Discover", href: "/discover", icon: "🌿" },
  { label: "Account", href: "/account", icon: "👤" },
];

export default function ResponsiveShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDesktop, setIsDesktop] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Detect desktop width
  useEffect(() => {
    const update = () => setIsDesktop(window.innerWidth >= 860);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Check auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);


  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };


  return (
    <div className="min-h-screen flex text-[var(--botanical-text-primary)] font-[var(--font-primary)]" style={{ background: 'transparent' }}>
      {/* Desktop Sidebar */}
      {isDesktop && (
        <aside
          className="fixed left-0 top-0 h-screen w-64 border-r border-white/10 bg-white/8 backdrop-blur-lg p-6 flex flex-col z-50 overflow-y-auto shadow-lg"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full border border-[var(--botanical-accent)]/50 flex items-center justify-center overflow-hidden bg-transparent p-2">
              <img src="/brand/logos/botanical-logo-mark.svg" alt="StrainSpotter" className="w-full h-full object-contain opacity-90 drop-shadow-[0_0_10px_var(--botanical-glow)]" />
            </div>
            <span className="text-xl font-semibold text-[var(--botanical-accent)]">StrainSpotter</span>
          </div>

          {/* Navigation - Top-level only */}
          <nav className="flex flex-col gap-1">
            {topLevelNavItems.map((item) => {
              const isActive = 
                pathname === item.href ||
                (item.href === "/" && pathname === "/") ||
                (item.href === "/garden" && pathname.startsWith("/garden") && !pathname.startsWith("/garden/strain-library") && !pathname.startsWith("/garden/strains")) ||
                (item.href === "/scanner" && pathname.startsWith("/scanner")) ||
                (item.href === "/community" && pathname.startsWith("/community")) ||
                (item.href === "/discover" && (pathname.startsWith("/discover") || pathname.startsWith("/garden/strain-library") || pathname.startsWith("/garden/strains"))) ||
                (item.href === "/account" && pathname.startsWith("/account"));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "px-3 py-2.5 rounded-md transition-all flex items-center gap-3 hover:bg-green-400/10",
                    isActive && "bg-green-400/20 text-green-300 font-medium"
                  )}
                >
                  {item.icon === "🔍" ? (
                    <SearchIcon />
                  ) : (
                    <span className="text-lg">{item.icon}</span>
                  )}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Auth Section */}
          <div className="mt-auto pt-4 border-t border-[var(--botanical-border)]">
            {!loading && (
              <>
                {user ? (
                  <div className="space-y-2">
                    <div className="text-xs text-[var(--botanical-text-secondary)] px-3 py-1">
                      {user.email}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-3 py-2 rounded-md transition-all flex items-center gap-2 hover:bg-red-500/10 text-red-400 text-sm"
                    >
                      Log out
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/auth/login"
                    className="px-3 py-2 rounded-md transition-all flex items-center gap-2 hover:bg-green-400/10 text-[var(--botanical-accent)] text-sm"
                  >
                    Sign in
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="mt-4 space-y-2 text-xs text-[var(--botanical-text-muted)]">
            <div>© {new Date().getFullYear()} StrainSpotter</div>
            <Link 
              href="/about" 
              className="block hover:text-[var(--botanical-accent)] transition"
            >
              What StrainSpotter Is / Isn't
            </Link>
          </div>
        </aside>
      )}

      {/* MAIN CONTENT AREA */}
      <main className={`flex-1 ${pathname === '/' ? 'p-0' : 'p-4 md:p-8'} w-full ${isDesktop ? 'ml-64' : 'pb-20'}`} style={{ background: 'transparent' }}>
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      {!isDesktop && <BottomTabBar />}
    </div>
  );
}
