import MembershipGate from "@/components/MembershipGate";

export default function GardenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MembershipGate>
      <section className="min-h-screen text-white">
        {children}
      </section>
    </MembershipGate>
  );
}
