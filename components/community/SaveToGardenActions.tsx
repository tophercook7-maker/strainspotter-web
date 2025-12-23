"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateCommunityPrefill, encodeCommunityPrefill } from "@/lib/community/logbookPrefill";

interface SaveToGardenActionsProps {
  reply?: { body: string; id: string; user?: { username?: string | null } };
  post?: { body: string; id: string; title?: string; user?: { username?: string | null } };
}

export default function SaveToGardenActions({ reply, post }: SaveToGardenActionsProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSaveToLogbook = () => {
    const content = reply?.body || post?.body || "";
    const sourceId = reply?.id || post?.id || "";
    const sourceType = reply ? "reply" : "post";
    const sourceTitle = post?.title;
    const sourceAuthor = reply?.user?.username || post?.user?.username;
    
    const prefill = generateCommunityPrefill(content, sourceId, sourceType, sourceTitle, sourceAuthor);
    const encoded = encodeCommunityPrefill(prefill);
    router.push("/garden/logbook?prefill=" + encoded);
  };

  const handleSaveAsTask = () => {
    const content = reply?.body || post?.body || "";
    const sourceId = reply?.id || post?.id || "";
    const sourceType = reply ? "reply" : "post";
    const sourceTitle = post?.title;
    const sourceAuthor = reply?.user?.username || post?.user?.username;
    
    // For tasks, create a prefilled title
    const taskTitle = sourceTitle 
      ? `Try suggestion from Community: ${sourceTitle}`
      : "Try nutrient adjustment suggested in Community";
    
    const encoded = encodeURIComponent(taskTitle);
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
