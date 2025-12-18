/**
 * Scraper Control Panel
 * Manage scraper jobs and configuration
 */

import { requireAdmin } from '@/lib/adminAuth';
import ScraperControlClient from './ScraperControlClient';

export const dynamic = 'force-dynamic';

export default async function ScraperControlPage() {
  await requireAdmin();

  return <ScraperControlClient />;
}
