/**
 * Admin Matcher V3
 * Compare v2 vs v3 performance and tune weights
 */

import { requireAdmin } from '@/lib/adminAuth';
import MatcherV3AdminClient from './MatcherV3AdminClient';

export default async function MatcherV3AdminPage() {
  await requireAdmin();

  return <MatcherV3AdminClient />;
}
