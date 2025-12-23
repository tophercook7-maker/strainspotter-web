import { getVaultStatus } from './readers/vaultStatus.js';
import { getScraperState } from './readers/scraperState.js';
import { getHeroStatus } from './readers/heroStatus.js';
import { getFilesystemStatus } from './readers/filesystem.js';

export function getPipelineStatus() {
  const vault = getVaultStatus();
  const scraper = getScraperState();
  const heroes = getHeroStatus();
  const filesystem = getFilesystemStatus();

  const ok =
    vault.mounted &&
    scraper.valid &&
    filesystem.ok;

  return {
    ok,
    vault,
    scraper,
    heroes,
    filesystem,
    timestamp: new Date().toISOString()
  };
}
