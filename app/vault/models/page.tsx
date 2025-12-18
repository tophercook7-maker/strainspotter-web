/**
 * Vault Model Zoo
 */

import VaultAuthGate from '../VaultAuthGate';
import VaultLayout from '../VaultLayout';
import ModelsClient from './ModelsClient';

export default async function ModelsPage() {
  return (
    <VaultAuthGate>
      <VaultLayout>
        <ModelsClient />
      </VaultLayout>
    </VaultAuthGate>
  );
}
