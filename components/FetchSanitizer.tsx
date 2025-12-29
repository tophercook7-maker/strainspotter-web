"use client";

import { useEffect } from "react";
import { installSanitizedLocalStorage } from "@/lib/sanitizeLocalStorage";

export default function FetchSanitizer() {
  useEffect(() => {
    // Install localStorage sanitizer as backup (Supabase fetch is overridden directly)
    installSanitizedLocalStorage();
  }, []);

  return null;
}

