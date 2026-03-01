import { GlassBackground } from "@/app/_components/GlassBackground";
import { PageHeaderNav } from "@/app/_components/PageHeaderNav";
import AgeGateClient from "./AgeGateClient";

export default function AgeGatePage() {
  return (
    <main className="min-h-screen text-white">
      <GlassBackground />

      <div className="mx-auto w-full max-w-[720px] px-4 py-6 space-y-6">
        <PageHeaderNav title="Age Gate" showBack={false} />

        <section className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur-md p-6">
          <h1 className="text-3xl font-semibold text-green-300">Welcome</h1>
          <p className="mt-2 text-white/80">
            You must be 21 or older to continue.
          </p>

          <div className="mt-6">
            <AgeGateClient />
          </div>

          <p className="mt-4 text-xs text-white/50">
            This app is for adults. By continuing you confirm you meet the age requirement in your location.
          </p>
        </section>
      </div>
    </main>
  );
}
