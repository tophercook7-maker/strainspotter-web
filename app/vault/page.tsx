/**
 * Vault Dashboard
 * Main overview page
 */

import VaultAuthGate from './VaultAuthGate';
import VaultLayout from './VaultLayout';
import VaultDashboardClient from './VaultDashboardClient';

export default async function VaultPage() {
  return (
    <VaultAuthGate>
      <VaultLayout>
        <VaultDashboardClient />
      </VaultLayout>
    </VaultAuthGate>
  );
}
