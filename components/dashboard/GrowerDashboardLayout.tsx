"use client";

import { ReactNode } from "react";
import { useState } from "react";

import { Menu, X } from "lucide-react";

import Link from "next/link";

import clsx from "clsx";



const navItems = [

  { name: "📦 Inventory", href: "/grower/inventory" },

  { name: "📋 Batches", href: "/grower/batches" },

  { name: "📊 Analytics", href: "/grower/analytics" },

  { name: "⚙️ Settings", href: "/grower/settings" },

];



type Props = {
  children: ReactNode;
};

export default function GrowerDashboardLayout({
  children,
}: Props) {

  const [mobileOpen, setMobileOpen] = useState(false);



  return (

    <div className="flex min-h-screen bg-black text-white">



      {/* DESKTOP SIDEBAR */}

      <aside className="hidden md:flex w-64 bg-black/60 backdrop-blur-md border-r border-green-500/40 flex-col p-6">

        <div className="text-green-400 text-xl font-bold mb-8">

          Grower Dashboard

        </div>



        <nav className="flex flex-col gap-4">

          {navItems.map((item) => (

            <Link

              key={item.href}

              href={item.href}

              className="text-gray-300 hover:text-green-300 transition"

            >

              {item.name}

            </Link>

          ))}

        </nav>

      </aside>



      {/* MOBILE TOP BAR */}

      <header className="md:hidden fixed top-0 inset-x-0 z-30 bg-black/70 backdrop-blur-lg border-b border-green-500/40 p-4 flex items-center justify-between">

        <h1 className="text-green-400 font-bold text-lg">Dashboard</h1>

        {mobileOpen ? (

          <X className="w-8 h-8 text-green-300" onClick={() => setMobileOpen(false)} />

        ) : (

          <Menu className="w-8 h-8 text-green-300" onClick={() => setMobileOpen(true)} />

        )}

      </header>



      {/* MOBILE SLIDE-OUT MENU */}

      {mobileOpen && (

        <div className="fixed top-16 inset-x-0 bg-black/85 backdrop-blur-xl border-b border-green-400/20 p-6 flex flex-col gap-6 z-20">

          {navItems.map((item) => (

            <Link

              key={item.href}

              href={item.href}

              onClick={() => setMobileOpen(false)}

              className="text-gray-300 hover:text-green-300 transition text-lg"

            >

              {item.name}

            </Link>

          ))}

        </div>

      )}



      {/* MAIN CONTENT */}

      <main className="flex-1 p-6 md:ml-0 mt-16 md:mt-0">

        {children}

      </main>

    </div>

  );

}
