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
      <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
        {showBack ? (
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
          >
            ← Back
          </button>
        ) : null}

        {!hideHome && (
          <Link
            href="/garden"
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
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
