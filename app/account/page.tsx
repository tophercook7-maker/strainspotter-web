"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AccountPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Account</h1>
      <button onClick={handleSignOut}>Sign out</button>
    </div>
  );
}
