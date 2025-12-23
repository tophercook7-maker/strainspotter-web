import fs from 'fs';
import path from 'path';

const STATE_FILE = path.join(
  process.env.HOME,
  'strainspotter_scraper/scraper_state.json'
);

const TOTAL_STRAINS = 35137;

export function getScraperState() {
  if (!fs.existsSync(STATE_FILE)) {
    return {
      valid: false,
      error: 'scraper_state.json missing'
    };
  }

  const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  const errors = [];

  if (typeof raw.current !== 'number') errors.push('current missing');
  if (!raw.strain_name) errors.push('strain_name missing');
  if (!raw.state) errors.push('state missing');

  if (raw.current < 0 || raw.current > TOTAL_STRAINS) {
    errors.push('current out of bounds');
  }

  return {
    current: raw.current,
    total: TOTAL_STRAINS,
    strain_name: raw.strain_name,
    state: raw.state,
    valid: errors.length === 0,
    errors
  };
}
