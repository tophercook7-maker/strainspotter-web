/**
 * Vault Scraper Control Center
 */

import VaultAuthGate from '../VaultAuthGate';
import VaultLayout from '../VaultLayout';
import ScraperPanel from './ScraperPanel';

export default async function ScraperPage() {
  return (
    <VaultAuthGate>
      <VaultLayout>
        <ScraperPanel />
      </VaultLayout>
    </VaultAuthGate>
  );
}
