/**
 * Vault Generator Control Center
 */

import VaultAuthGate from '../VaultAuthGate';
import VaultLayout from '../VaultLayout';
import GeneratorPanel from './GeneratorPanel';

export default async function GeneratorPage() {
  return (
    <VaultAuthGate>
      <VaultLayout>
        <GeneratorPanel />
      </VaultLayout>
    </VaultAuthGate>
  );
}
