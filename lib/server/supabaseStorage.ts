/**
 * Typed facade over lib/server/supabaseStorage.js for Next.js server code.
 * Do not import from client components.
 */

import { createRequire } from "node:module";
import type { SupabaseClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const impl = require("./supabaseStorage.js") as {
  getSupabaseAdminClient: () => SupabaseClient;
  ensureScannerBuckets: (admin?: SupabaseClient) => Promise<void>;
  uploadReferenceImageToSupabase: (opts: {
    localPath: string;
    strainSlug: string;
    contentHash: string;
    ext: string;
    admin?: SupabaseClient;
  }) => Promise<{ bucket: string; path: string }>;
  uploadRawReferenceImageToSupabase: (opts: {
    localPath: string;
    strainSlug: string;
    contentHash: string;
    ext: string;
    reviewStatus: string;
    admin?: SupabaseClient;
  }) => Promise<{ bucket: string; path: string }>;
  uploadTrainingImageToSupabase: (opts: {
    localPath: string;
    strainSlug: string;
    contentHash: string;
    ext: string;
    admin?: SupabaseClient;
  }) => Promise<{ bucket: string; path: string }>;
  getPublicOrSignedUrl: (
    bucket: string,
    objectPath: string,
    opts?: { admin?: SupabaseClient; signedSeconds?: number }
  ) => Promise<{ url: string; kind: "public" | "signed"; expiresIn?: number }>;
  referenceBucketId: () => string;
  trainingBucketId: () => string;
  rawBucketId: () => string;
};

export const getSupabaseAdminClient = impl.getSupabaseAdminClient;
export const ensureScannerBuckets = impl.ensureScannerBuckets;
export const uploadReferenceImageToSupabase = impl.uploadReferenceImageToSupabase;
export const uploadRawReferenceImageToSupabase = impl.uploadRawReferenceImageToSupabase;
export const uploadTrainingImageToSupabase = impl.uploadTrainingImageToSupabase;
export const getPublicOrSignedUrl = impl.getPublicOrSignedUrl;
export const referenceBucketId = impl.referenceBucketId;
export const trainingBucketId = impl.trainingBucketId;
export const rawBucketId = impl.rawBucketId;
