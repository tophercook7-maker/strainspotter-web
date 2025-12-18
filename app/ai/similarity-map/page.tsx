/**
 * Cross-Strain Similarity Map
 * Interactive 2D visualization of strain relationships
 */

import { getUser } from '@/lib/auth';
import SimilarityMapClient from './SimilarityMapClient';

export default async function SimilarityMapPage() {
  const user = await getUser();

  return <SimilarityMapClient />;
}
