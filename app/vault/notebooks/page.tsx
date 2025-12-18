/**
 * Vault Notebooks
 */

import VaultAuthGate from '../VaultAuthGate';
import VaultLayout from '../VaultLayout';
import NotebooksClient from './NotebooksClient';

export default async function NotebooksPage() {
  return (
    <VaultAuthGate>
      <VaultLayout>
        <NotebooksClient />
      </VaultLayout>
    </VaultAuthGate>
  );
}
