"use client";

export default function ComingSoon({ title }: { title: string }) {
  return (
    <main className="min-h-screen w-full flex items-center justify-center text-white">
      <div className="text-center backdrop-blur-sm bg-black/30 px-10 py-8 rounded-3xl">
        <h1 className="text-4xl font-bold text-green-400 mb-3">{title}</h1>
        <p className="text-white/80">Coming Soon</p>
      </div>
    </main>
  );
}
