/**
 * Scraper Control Panel
 * Manage scraper jobs and configuration
 */

import { requireAdmin } from '@/lib/adminAuth';
import ScraperControlClient from './ScraperControlClient';

export default async function ScraperControlPage() {
  await requireAdmin();

  return <ScraperControlClient />;
}
