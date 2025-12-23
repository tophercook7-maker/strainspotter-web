import fs from 'fs';

const HERO_DIR = '/Volumes/TheVault/StrainSpotter-Dataset/AI-Hero-Images';
const TOTAL_STRAINS = 35137;

export function getHeroStatus() {
  if (!fs.existsSync(HERO_DIR)) {
    return {
      generated: 0,
      total: TOTAL_STRAINS,
      missing: TOTAL_STRAINS,
      error: 'hero directory missing'
    };
  }

  const count = fs.readdirSync(HERO_DIR)
    .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
    .length;

  return {
    generated: count,
    total: TOTAL_STRAINS,
    missing: TOTAL_STRAINS - count
  };
}
