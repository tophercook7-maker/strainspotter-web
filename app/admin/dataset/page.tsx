/**
 * Admin Dataset Dashboard
 * Manage strain datasets and trigger pipeline operations
 */

import { requireAdmin } from '@/lib/adminAuth';
import DatasetDashboardClient from './DatasetDashboardClient';

export default async function DatasetDashboardPage() {
  await requireAdmin();

  return <DatasetDashboardClient />;
}
