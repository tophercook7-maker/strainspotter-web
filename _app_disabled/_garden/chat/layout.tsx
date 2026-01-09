import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ChatUserProvider } from "@/components/garden/ChatUserProvider";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?redirect=${encodeURIComponent("/garden/chat")}`);
  }

  // Ensure profile exists
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  let ensuredProfile = profile;
  if (!profile) {
    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email,
        role: "user",
        tier: "free",
      })
      .select()
      .single();
    if (!insertError) {
      ensuredProfile = inserted;
    }
  }

  if (profileError) {
    console.error("[chat-auth] profile fetch failed for user", user.id, profileError.message);
  }
  if (!ensuredProfile) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-sm text-white/70">Setting up your Garden…</p>
      </div>
    );
  }

  // Server-side log (non-PII) to verify mapping
  console.log("[chat-auth] user", user.id, "profile", ensuredProfile.id);

  const displayName =
    (user.user_metadata && (user.user_metadata.full_name as string | undefined)) ||
    user.email ||
    "Garden member";

  return (
    <ChatUserProvider user={{ id: user.id, email: user.email ?? "", displayName }}>
      {children}
    </ChatUserProvider>
  );
}

