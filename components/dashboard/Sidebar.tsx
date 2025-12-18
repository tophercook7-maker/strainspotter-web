// components/dashboard/Sidebar.tsx

"use client";

import Link from "next/link";

import Image from "next/image";

import { usePathname } from "next/navigation";

import { User } from "@/lib/auth";



export default function Sidebar({ user }: { user: User }) {

  const path = usePathname();



  const nav = [

    { href: "/dashboard/member", label: "Member Home", roles: ["member"] },

    { href: "/dashboard/grower", label: "Grower Home", roles: ["grower"] },

    { href: "/dashboard/dispensary", label: "Dispensary Home", roles: ["dispensary"] },

    { href: "/dashboard/admin", label: "Admin Panel", roles: ["admin"] },

  ];



  return (

    <aside className="sidebar">

      <div className="sidebar-header">

        <Image

          src="/emblem/hero.png"

          width={64}

          height={64}

          alt="StrainSpotter"

          className="sidebar-logo"

        />

        <h2 className="sidebar-title">StrainSpotter</h2>

      </div>



      {nav

        .filter((n) => n.roles.includes(user.role || "member"))

        .map((n) => (

          <Link

            key={n.href}

            href={n.href}

            className={`sidebar-link ${path === n.href ? "active" : ""}`}

          >

            {n.label}

          </Link>

        ))}



      <footer className="sidebar-footer">

        <p>{user.email}</p>

      </footer>

    </aside>

  );

}
