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
      className="flex-1 text-center py-3 px-2 no-underline text-white"
      style={{
        borderTop: active ? "2px solid #3ddc84" : "2px solid transparent",
        opacity: active ? 1 : 0.8,
        fontWeight: active ? 700 : 500,
      }}
    >
      {label}
    </Link>
  );
}

export default function GardenBottomBar() {
  return (
    <nav
      className="fixed left-0 right-0 bottom-0 flex justify-center text-white z-50"
      style={{
        background: "rgba(10, 14, 10, 0.96)",
        backdropFilter: "blur(8px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
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
