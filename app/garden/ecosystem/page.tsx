import TopNav from "../_components/TopNav";

export default function EcosystemPage() {
  return (
    <>
      <TopNav title="Ecosystem" showBack />
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-12">
          <div className="rounded-3xl border border-white/15 bg-white/10 p-8 backdrop-blur-xl shadow-2xl shadow-black/30">
            <h1 className="text-4xl font-extrabold tracking-tight mb-4">Ecosystem</h1>
            <p className="text-white/80 text-lg mb-6">
              Explore the interconnected world of cannabis genetics, terpenes, and effects. 
              Understand how strains relate to each other and discover new connections.
            </p>
            <div className="inline-flex items-center rounded-full border border-white/15 bg-black/30 px-4 py-2 text-sm text-white/80">
              🚧 In development
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
