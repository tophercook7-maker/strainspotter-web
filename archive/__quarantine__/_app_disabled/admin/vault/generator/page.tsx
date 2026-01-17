/**
 * Generator Control Panel
 * Manage synthetic image generation
 */

import { requireAdmin } from '@/lib/adminAuth';
import GeneratorControlClient from './GeneratorControlClient';

export const dynamic = 'force-dynamic';

export default async function GeneratorControlPage() {
  await requireAdmin();

  return <GeneratorControlClient />;
}
