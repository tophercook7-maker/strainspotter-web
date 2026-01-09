/**
 * Vault Mission Control
 * Comprehensive system dashboard
 */

import VaultAuthGate from '../VaultAuthGate';
import VaultLayout from '../VaultLayout';
import MissionControlClient from './MissionControlClient';

export default async function MissionControlPage() {
  return (
    <VaultAuthGate>
      <VaultLayout>
        <MissionControlClient />
      </VaultLayout>
    </VaultAuthGate>
  );
}
