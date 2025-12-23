import fs from 'fs';

const REQUIRED = [
  '/Volumes/TheVault/StrainSpotter-Dataset',
  '/Volumes/TheVault/StrainSpotter-Dataset/AI-Hero-Images'
];

export function getFilesystemStatus() {
  const missing = REQUIRED.filter(p => !fs.existsSync(p));
  return {
    ok: missing.length === 0,
    missing
  };
}
