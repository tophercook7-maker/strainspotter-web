/**
 * Vault Remote Desktop
 */

import VaultAuthGate from '../VaultAuthGate';
import VaultLayout from '../VaultLayout';
import RemoteDesktopClient from './RemoteDesktopClient';

export default async function RemoteDesktopPage() {
  return (
    <VaultAuthGate>
      <VaultLayout>
        <RemoteDesktopClient />
      </VaultLayout>
    </VaultAuthGate>
  );
}
