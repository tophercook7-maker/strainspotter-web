"use client";

import { useEffect } from "react";
import { resetSupabaseStorage } from "@/lib/resetSupabaseStorage";

/**
 * Component that resets Supabase storage on mount
 * Must be rendered BEFORE any Supabase client is used
 */
export default function SupabaseStorageReset() {
  useEffect(() => {
    // Reset storage immediately on mount, before any Supabase client initialization
    resetSupabaseStorage();
  }, []);

  return null;
}

