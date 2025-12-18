/**
 * Phenotype Clustering Explorer
 * View and manage phenotype clusters for strains
 */

import { requireAdmin } from '@/lib/adminAuth';
import ClustersClient from './ClustersClient';

export default async function ClustersPage() {
  await requireAdmin();

  return <ClustersClient />;
}
