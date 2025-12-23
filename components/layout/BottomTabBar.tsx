"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";

interface TabItem {
  label: string;
  href: string;
  icon: string;
  primary?: boolean; // Scan is primary (center, larger)
}

const tabs: TabItem[] = [
  { label: "Scan", href: "/scanner", icon: "🔍", primary: true },
  { label: "Garden", href: "/garden", icon: "🌿" },
  { label: "Community", href: "/community", icon: "👥" },
  { label: "Dashboard", href: "/garden/dashboard", icon: "📊" },
  { label: "Account", href: "/account", icon: "👤" },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  // Determine if a tab is active based on pathname
  const isActive = (href: string) => {
    if (href === "/scanner") {
      return pathname === "/scanner" || pathname.startsWith("/scan/");
    }
    if (href === "/garden") {
      return pathname === "/garden" || 
             pathname.startsWith("/garden/") && 
             !pathname.startsWith("/garden/dashboard");
    }
    if (href === "/garden/dashboard") {
      return pathname === "/garden/dashboard";
    }
    if (href === "/community") {
      return pathname.startsWith("/community");
    }
    if (href === "/account") {
      return pathname.startsWith("/account") || 
             pathname.startsWith("/settings") ||
             pathname.startsWith("/profile");
    }
    return pathname === href;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/20 md:hidden safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.3)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          
          if (tab.primary) {
            // Scan tab - larger, centered, primary
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={clsx(
                  "flex flex-col items-center justify-center",
                  "w-16 h-16 rounded-full transition-all",
                  "relative",
                  active
                    ? "bg-emerald-600/30 text-emerald-400 scale-110"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                )}
              >
                <span className="text-2xl mb-0.5">{tab.icon}</span>
                <span className="text-xs font-medium">{tab.label}</span>
                {active && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
                )}
              </Link>
            );
          }

          // Regular tabs
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                "flex flex-col items-center justify-center",
                "flex-1 h-full transition-all",
                "relative",
                active
                  ? "text-emerald-400"
                  : "text-white/60 hover:text-white/80"
              )}
            >
              <span className="text-xl mb-0.5">{tab.icon}</span>
              <span className="text-[10px] font-medium">{tab.label}</span>
              {active && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
