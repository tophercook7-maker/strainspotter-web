"use client";

import { useEffect } from "react";

export default function ActivityPing() {
  useEffect(() => {
    fetch("/api/activity/ping", { method: "POST" }).catch(() => {});
  }, []);

  return null;
}
