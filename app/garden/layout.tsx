import MembershipGate from "@/components/MembershipGate";
import { SelectedGrowProvider } from "@/components/garden/SelectedGrowProvider";

export default function GardenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MembershipGate>
      <SelectedGrowProvider>
        <section className="min-h-screen text-white">
          {children}
        </section>
      </SelectedGrowProvider>
    </MembershipGate>
  );
}
