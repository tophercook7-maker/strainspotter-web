/**
 * Vault Cluster Manager
 */

import VaultAuthGate from '../VaultAuthGate';
import VaultLayout from '../VaultLayout';
import ClusterPanel from './ClusterPanel';

export default async function ClustersPage() {
  return (
    <VaultAuthGate>
      <VaultLayout>
        <ClusterPanel />
      </VaultLayout>
    </VaultAuthGate>
  );
}
