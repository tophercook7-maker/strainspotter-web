/**
 * Vault Datasets Manager
 */

import VaultAuthGate from '../VaultAuthGate';
import VaultLayout from '../VaultLayout';
import DatasetManager from './DatasetManager';

export default async function DatasetsPage() {
  return (
    <VaultAuthGate>
      <VaultLayout>
        <DatasetManager />
      </VaultLayout>
    </VaultAuthGate>
  );
}
