import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

export default async function GardenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/auth/login");
  return <div className="relative" style={{ position: 'relative', zIndex: 1 }}>{children}</div>;
}
