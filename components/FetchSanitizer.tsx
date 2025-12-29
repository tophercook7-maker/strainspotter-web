"use client";

import { useEffect } from "react";
import { installFetchSanitizer } from "@/lib/sanitizeFetch";
import { installSanitizedLocalStorage } from "@/lib/sanitizeLocalStorage";

export default function FetchSanitizer() {
  useEffect(() => {
    // Install localStorage sanitizer FIRST (before Supabase initializes)
    installSanitizedLocalStorage();
    // Then install fetch sanitizer as backup
    installFetchSanitizer();
  }, []);

  return null;
}

