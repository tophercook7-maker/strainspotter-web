import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import MembershipGate from "@/components/MembershipGate";
import { SelectedGrowProvider } from "@/components/garden/SelectedGrowProvider";

export default async function GardenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?redirect=${encodeURIComponent("/garden")}`);
  }

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
