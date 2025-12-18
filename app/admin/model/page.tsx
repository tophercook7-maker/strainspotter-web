/**
 * Admin Model Tuner
 * Adjust matcher weights and test models
 */

import { requireAdmin } from '@/lib/adminAuth';
import ModelTunerClient from './ModelTunerClient';

export default async function ModelTunerPage() {
  await requireAdmin();

  return <ModelTunerClient />;
}
