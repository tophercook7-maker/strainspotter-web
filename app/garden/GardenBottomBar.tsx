"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function Item({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active =
    pathname === href || (href === "/garden" && pathname === "/garden");
  return (
    <Link
      href={href}
      className="flex-1 text-center py-3.5 px-3 min-h-[48px] flex items-center justify-center no-underline text-white transition-colors"
      style={{
        borderTop: active ? "3px solid #3ddc84" : "3px solid transparent",
        opacity: active ? 1 : 0.75,
        fontWeight: active ? 700 : 500,
        fontSize: "0.9rem",
      }}
    >
      {label}
    </Link>
  );
}

export default function GardenBottomBar() {
  return (
    <nav
      className="fixed left-0 right-0 bottom-0 flex justify-center text-white z-50 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      style={{
        background: "rgba(5, 8, 5, 0.97)",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 -2px 12px rgba(0,0,0,0.3)",
      }}
    >
      <div className="mx-auto w-full max-w-xl px-4 flex">
        <Item href="/garden/scanner" label="Scanner" />
        <Item href="/garden/history" label="Log Book" />
        <Item href="/garden/grow-coach" label="Grow Coach" />
      </div>
    </nav>
  );
}
