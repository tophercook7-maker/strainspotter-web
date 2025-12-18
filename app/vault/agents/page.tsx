/**
 * Vault AI Agents
 */

import VaultAuthGate from '../VaultAuthGate';
import VaultLayout from '../VaultLayout';
import AgentsClient from './AgentsClient';

export default async function AgentsPage() {
  return (
    <VaultAuthGate>
      <VaultLayout>
        <AgentsClient />
      </VaultLayout>
    </VaultAuthGate>
  );
}
