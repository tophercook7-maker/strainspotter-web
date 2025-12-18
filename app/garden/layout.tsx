import RequireMember from "@/lib/auth/RequireMember";

export default function GardenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Client-side auth + membership guard
  return <RequireMember>{children}</RequireMember>;
}
