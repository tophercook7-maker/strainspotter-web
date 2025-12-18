/**
 * Vault Manifest Manager
 */

import VaultAuthGate from '../VaultAuthGate';
import VaultLayout from '../VaultLayout';
import ManifestPanel from './ManifestPanel';

export default async function ManifestsPage() {
  return (
    <VaultAuthGate>
      <VaultLayout>
        <ManifestPanel />
      </VaultLayout>
    </VaultAuthGate>
  );
}
