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

   // Ensure profile exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email,
        role: "user",
        tier: "free",
      });
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
