/**
 * Vault Files Explorer
 */

import VaultAuthGate from '../VaultAuthGate';
import VaultLayout from '../VaultLayout';
import VaultDndProvider from '../components/VaultDndProvider';
import FileExplorer from './FileExplorer';

export default async function FilesPage() {
  return (
    <VaultAuthGate>
      <VaultLayout>
        <VaultDndProvider>
          <FileExplorer />
        </VaultDndProvider>
      </VaultLayout>
    </VaultAuthGate>
  );
}
