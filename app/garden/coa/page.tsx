import Link from "next/link";

export default function COAPage() {
  return (
    <div className="min-h-screen bg-[var(--botanical-bg-deep)] text-[var(--botanical-text-primary)] py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-8">
          <h1 className="text-3xl font-bold text-[var(--botanical-accent-alt)] mb-4">
            COA Tools
          </h1>
          <p className="text-lg text-[var(--botanical-text-secondary)] mb-6">
            Analyze Certificate of Analysis documents. Extract cannabinoid and terpene data, compare batches, and verify lab results.
          </p>
          <p className="text-sm text-[var(--botanical-text-muted)] mb-6 italic">
            Coming next / In progress
          </p>
          <Link
            href="/garden"
            className="inline-block px-6 py-3 bg-[var(--botanical-accent)] text-black rounded-lg font-semibold hover:opacity-90 transition"
          >
            ← Back to Garden
          </Link>
        </div>
      </div>
    </div>
  );
}
