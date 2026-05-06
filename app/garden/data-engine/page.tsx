import Link from "next/link";
import TopNav from "../_components/TopNav";

export default function DataEnginePage() {
  return (
    <div className="min-h-[60vh] text-white">
      <TopNav title="Data Engine" />
      <div className="mx-auto mt-10 max-w-lg flex flex-col gap-4 px-2">
        <h2 className="text-lg font-semibold text-white">
          Scanner reference, sync, and training controls coming soon.
        </h2>
        <Link
          href="/garden/scanner"
          className="inline-flex items-center rounded-lg bg-emerald-600/90 px-4 py-2.5 text-sm font-semibold text-white no-underline transition hover:bg-emerald-600"
        >
          Open Scanner
        </Link>
        <Link
          href="/garden/data-engine/external-review"
          className="inline-flex items-center rounded-lg bg-sky-600/90 px-4 py-2.5 text-sm font-semibold text-white no-underline transition hover:bg-sky-600"
        >
          External reference review
        </Link>
      </div>
    </div>
  );
}
