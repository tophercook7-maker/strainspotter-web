/**
 * Vault Settings Panel
 */

import VaultAuthGate from '../VaultAuthGate';
import VaultLayout from '../VaultLayout';
import SettingsPanel from './SettingsPanel';

export default async function SettingsPage() {
  return (
    <VaultAuthGate>
      <VaultLayout>
        <SettingsPanel />
      </VaultLayout>
    </VaultAuthGate>
  );
}
