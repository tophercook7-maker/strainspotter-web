/**
 * Vault AI System Monitor
 */

import VaultAuthGate from '../VaultAuthGate';
import VaultLayout from '../VaultLayout';
import AIMonitor from './AIMonitor';

export default async function AIPage() {
  return (
    <VaultAuthGate>
      <VaultLayout>
        <AIMonitor />
      </VaultLayout>
    </VaultAuthGate>
  );
}
