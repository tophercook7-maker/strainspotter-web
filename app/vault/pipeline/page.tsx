/**
 * Vault Pipeline Orchestrator
 */

import VaultAuthGate from '../VaultAuthGate';
import VaultLayout from '../VaultLayout';
import PipelinePanel from './PipelinePanel';

export default async function PipelinePage() {
  return (
    <VaultAuthGate>
      <VaultLayout>
        <PipelinePanel />
      </VaultLayout>
    </VaultAuthGate>
  );
}
