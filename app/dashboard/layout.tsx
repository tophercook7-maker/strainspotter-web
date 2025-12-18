// app/dashboard/layout.tsx

import { ReactNode } from "react";
import "../globals.css";

import Sidebar from "@/components/dashboard/Sidebar";

import { getUser } from "@/lib/auth";

import RoleGate from "@/components/dashboard/RoleGate";



export const metadata = {

  title: "StrainSpotter Dashboard",

};

type Props = {
  children: ReactNode;
};

export default async function DashboardLayout({
  children,
}: Props) {

  const user = await getUser();

  if (!user) {
    return <div>Please log in to access the dashboard.</div>;
  }

  return (

    <div className="dashboard-container">

      <Sidebar user={user} />

      <main className="dashboard-main">{children}</main>

    </div>

  );

}
