export default function ComingSoon({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <section className="w-full">
      <div className="rounded-3xl border border-white/15 bg-white/10 p-8 backdrop-blur-xl shadow-2xl shadow-black/30">
        <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-3 text-white/80">
          {description ?? "Coming soon."}
        </p>

        <div className="mt-8 inline-flex items-center rounded-full border border-white/15 bg-black/30 px-4 py-2 text-sm text-white/80">
          ⚠️ Under construction
        </div>
      </div>
    </section>
  );
}
