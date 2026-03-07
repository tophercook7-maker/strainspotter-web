"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  title: string;
  hideHome?: boolean;
  showBack?: boolean;
};

export function PageHeaderNav({ title, hideHome, showBack = true }: Props) {
  const router = useRouter();

  return (
    <header className="w-full">
      <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-2">
        {showBack ? (
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center justify-center min-h-[44px] gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-white hover:bg-white/[0.1] hover:border-white/20 transition-colors"
          >
            ← Back
          </button>
        ) : null}

        {!hideHome && (
          <Link
            href="/garden"
            className="inline-flex items-center justify-center min-h-[44px] gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-white no-underline hover:bg-white/[0.1] hover:border-white/20 transition-colors"
          >
            Home
          </Link>
        )}
        </div>

        <div className="text-lg font-semibold text-white">{title}</div>

        <div className="w-[140px]" />
      </div>
    </header>
  );
}
