"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SaveToGardenActionsProps {
  reply?: { body: string; id: string };
  post?: { body: string; id: string };
}

export default function SaveToGardenActions({ reply, post }: SaveToGardenActionsProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSaveToLogbook = () => {
    const text = reply?.body || post?.body || "";
    const encoded = encodeURIComponent(text.slice(0, 2000));
    router.push("/garden/logbook?prefill=" + encoded);
  };

  const handleSaveAsTask = () => {
    const text =
      reply?.body ||
      post?.body ||
      "";

    const encoded = encodeURIComponent(text.slice(0, 2000));

    router.push(`/garden/all/tasks?prefill=${encoded}`);
  };

  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <p className="text-xs text-white/60 mb-2">Save to Garden:</p>
      <div className="flex gap-2">
        <button
          onClick={handleSaveToLogbook}
          disabled={saving}
          className="px-3 py-1.5 text-xs bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 rounded-lg hover:bg-emerald-600/30 transition disabled:opacity-50"
        >
          📔 Save to Logbook
        </button>
        <button
          onClick={handleSaveAsTask}
          disabled={saving}
          className="px-3 py-1.5 text-xs bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 rounded-lg hover:bg-emerald-600/30 transition disabled:opacity-50"
        >
          ✓ Add as Task
        </button>
      </div>
    </div>
  );
}
