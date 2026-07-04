"use client";

// NewsStrip — live cannabis news, contextual per surface.
// <NewsStrip topic="business" title="🗞️ Industry News" /> etc.
// Renders nothing while loading/empty so it never blocks a page.

import { useState, useEffect } from "react";

interface NewsItem {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

export default function NewsStrip({
  topic,
  title = "🗞️ Cannabis News",
  limit = 5,
}: {
  topic?: string;
  title?: string;
  limit?: number;
}) {
  const [items, setItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const q = new URLSearchParams();
    if (topic) q.set("topic", topic);
    q.set("limit", String(limit));
    fetch(`/api/news?${q}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setItems(d.items ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [topic, limit]);

  if (!items.length) return null;

  return (
    <div style={{
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.16)",
      borderRadius: 16,
      padding: "16px 18px",
    }}>
      <div style={{ color: "white", fontWeight: 800, fontSize: 15, marginBottom: 10 }}>{title}</div>
      {items.map((n) => (
        <a
          key={n.link}
          href={n.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "block", padding: "7px 0", borderTop: "1px solid rgba(255,255,255,0.08)", textDecoration: "none" }}
        >
          <div style={{ color: "rgba(255,255,255,0.88)", fontSize: 13.5, lineHeight: 1.45, fontWeight: 600 }}>
            {n.title}
          </div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 2 }}>
            {n.source} · {timeAgo(n.publishedAt)}
          </div>
        </a>
      ))}
    </div>
  );
}
