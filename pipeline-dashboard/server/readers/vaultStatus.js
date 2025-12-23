import fs from 'fs';

const VAULT_PATH = '/Volumes/TheVault';

export function getVaultStatus() {
  return {
    path: VAULT_PATH,
    mounted: fs.existsSync(VAULT_PATH),
  };
}
