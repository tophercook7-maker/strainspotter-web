"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { SearchIcon } from "../icons/SearchIcon";
import { supabase } from "@/lib/supabase";
import BottomTabBar from "./BottomTabBar";

// Garden navigation items (primary workspace)
const gardenNavItems = [
  { label: "Dashboard", href: "/garden/dashboard", icon: "📊" },
  { label: "Garden Hub", href: "/garden", icon: "🏠" },
  { label: "Grow Logbook", href: "/garden/logbook", icon: "📔" },
  { label: "Grow Coach", href: "/garden/grow-coach", icon: "🤖" },
  { label: "Scanner", href: "/scanner", icon: "🔍" },
  { label: "Plants", href: "/garden/plants", icon: "🌱" },
];

// Discover items (secondary, reference)
const discoverNavItems = [
  { label: "Strain Library", href: "/garden/strain-library", icon: "🌿" },
];

// Community items (secondary, social)
const communityNavItems = [
  { label: "Community", href: "/community", icon: "👥" },
];

// Tools (only if actually usable)
const toolsNavItems: Array<{ label: string; href: string; icon: string }> = [
  // Spot AI only if it exists and works - commented out for now
  // { label: "Spot AI", href: "/spot", icon: "🤖" },
];

export default function ResponsiveShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDesktop, setIsDesktop] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [gardenExpanded, setGardenExpanded] = useState(true);

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-expand Garden if on a garden route
  useEffect(() => {
    if (pathname.startsWith("/garden") || pathname === "/scanner") {
      setGardenExpanded(true);
    }
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const isGardenRoute = pathname.startsWith("/garden") || pathname === "/scanner";
  const isDiscoverRoute = pathname.startsWith("/garden/strain-library") || pathname.startsWith("/garden/strains");
  const isCommunityRoute = pathname.startsWith("/community");

  return (
    <div className="min-h-screen flex bg-transparent text-[var(--botanical-text-primary)] font-[var(--font-primary)]">
      {/* Desktop Sidebar */}
      {isDesktop && (
        <aside
          className="fixed left-0 top-0 h-screen w-64 border-r border-[var(--botanical-border)] bg-[var(--botanical-bg-panel)]/80 backdrop-blur-md p-6 flex flex-col z-50 overflow-y-auto"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full border border-[var(--botanical-accent)]/50 flex items-center justify-center overflow-hidden bg-transparent p-2">
              <img src="/brand/logos/botanical-logo-mark.svg" alt="StrainSpotter" className="w-full h-full object-contain opacity-90 drop-shadow-[0_0_10px_var(--botanical-glow)]" />
            </div>
            <span className="text-xl font-semibold text-[var(--botanical-accent)]">StrainSpotter</span>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-2">
            {/* Garden - Primary Workspace */}
            <div>
              <Link
                href="/garden"
                className={clsx(
                  "px-3 py-2 rounded-md transition-all flex items-center gap-2 hover:bg-green-400/10 font-semibold",
                  isGardenRoute && "bg-green-400/20 text-green-300"
                )}
              >
                <span className="text-lg">🌿</span>
                Garden
              </Link>
              {gardenExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  {gardenNavItems.map((item) => {
                    const isActive = pathname === item.href || 
                      (item.href === "/garden/dashboard" && pathname.startsWith("/garden/dashboard")) ||
                      (item.href === "/garden" && (pathname === "/garden" || pathname.startsWith("/garden/all"))) ||
                      (item.href === "/scanner" && pathname.startsWith("/scanner")) ||
                      (item.href === "/garden/logbook" && pathname.startsWith("/garden/logbook")) ||
                      (item.href === "/garden/grow-coach" && pathname.startsWith("/garden/grow-coach")) ||
                      (item.href === "/garden/plants" && pathname.startsWith("/garden/plants"));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={clsx(
                          "px-3 py-1.5 rounded-md transition-all flex items-center gap-2 text-sm hover:bg-green-400/10",
                          isActive && "bg-green-400/20 text-green-300"
                        )}
                      >
                        {item.icon === "🔍" ? (
                          <SearchIcon />
                        ) : (
                          <span className="text-sm">{item.icon}</span>
                        )}
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Discover - Secondary */}
            {discoverNavItems.length > 0 && (
              <div className="mt-4">
                <div className="px-3 py-2 text-xs font-semibold text-[var(--botanical-text-secondary)] uppercase tracking-wider">
                  Discover
                </div>
                {discoverNavItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        "px-3 py-2 rounded-md transition-all flex items-center gap-2 hover:bg-green-400/10",
                        isActive && "bg-green-400/20 text-green-300"
                      )}
                    >
                      <span className="text-lg">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Community - Secondary */}
            {communityNavItems.length > 0 && (
              <div className="mt-4">
                <div className="px-3 py-2 text-xs font-semibold text-[var(--botanical-text-secondary)] uppercase tracking-wider">
                  Community
                </div>
                {communityNavItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        "px-3 py-2 rounded-md transition-all flex items-center gap-2 hover:bg-green-400/10",
                        isActive && "bg-green-400/20 text-green-300"
                      )}
                    >
                      <span className="text-lg">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Tools - Only if usable */}
            {toolsNavItems.length > 0 && (
              <div className="mt-4">
                <div className="px-3 py-2 text-xs font-semibold text-[var(--botanical-text-secondary)] uppercase tracking-wider">
                  Tools
                </div>
                {toolsNavItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        "px-3 py-2 rounded-md transition-all flex items-center gap-2 hover:bg-green-400/10",
                        isActive && "bg-green-400/20 text-green-300"
                      )}
                    >
                      <span className="text-lg">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
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
      <main className={`flex-1 ${pathname === '/' ? 'p-0' : 'p-4 md:p-8'} w-full ${isDesktop ? 'ml-64' : 'pb-20'}`}>
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      {!isDesktop && <BottomTabBar />}
    </div>
  );
}
