// app/dashboard/page.tsx

import { redirect } from "next/navigation";

import { getUser } from "@/lib/auth";

export const dynamic = 'force-dynamic'; // Force dynamic rendering since we use cookies

export default async function DashboardIndex() {
  const user = await getUser();

  if (!user) redirect("/login");

  // Simple role-based routing
  if (user.role === "member") redirect("/dashboard/member");
  if (user.role === "grower") redirect("/dashboard/grower");
  if (user.role === "dispensary") redirect("/dashboard/dispensary");
  if (user.role === "admin") redirect("/dashboard/admin");

  return <></>;
}
