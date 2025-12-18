/**
 * Admin Augmentation Test
 * Preview all augmentations for an image
 */

import { requireAdmin } from '@/lib/adminAuth';
import AugmentTestClient from './AugmentTestClient';

export default async function AugmentTestPage() {
  await requireAdmin();

  return <AugmentTestClient />;
}
