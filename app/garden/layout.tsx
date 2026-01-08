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
          <div style={{ padding: 8, background: 'rgba(59,130,246,0.9)', color: 'white', textAlign: 'center', width: '100%', maxWidth: '32rem', borderRadius: 8, margin: '0 auto 12px auto' }}>
            ACTIVE GARDEN LAYOUT: app/garden/layout.tsx
          </div>
          {children}
        </section>
      </SelectedGrowProvider>
    </MembershipGate>
  );
}
