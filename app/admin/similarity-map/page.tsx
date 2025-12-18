/**
 * Admin Similarity Map
 * View and rebuild similarity map
 */

import { requireAdmin } from '@/lib/adminAuth';
import SimilarityMapAdminClient from './SimilarityMapAdminClient';

export const dynamic = 'force-dynamic';

export default async function SimilarityMapAdminPage() {
  await requireAdmin();

  return <SimilarityMapAdminClient />;
}
