// Temporarily bypass auth for local development
// import RequireMember from "@/lib/auth/RequireMember";

export default function GardenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // LOCAL DEV ONLY: Bypass auth to see UI
  // TODO: Re-enable RequireMember when auth is configured
  return <>{children}</>;
}
