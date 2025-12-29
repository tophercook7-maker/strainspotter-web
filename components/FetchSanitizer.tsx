"use client";

import { useEffect } from "react";
import { installFetchSanitizer } from "@/lib/sanitizeFetch";

export default function FetchSanitizer() {
  useEffect(() => {
    installFetchSanitizer();
  }, []);

  return null;
}

