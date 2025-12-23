import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const PID_FILE = '/Volumes/TheVault/StrainSpotter-Dataset/scraper.pid';
const SCRAPER_CMD = 'node';
const SCRAPER_ARGS = ['run-scraper.mjs'];
const SCRAPER_CWD = `${process.env.HOME}/strainspotter_scraper`;

export function isRunning() {
  if (!fs.existsSync(PID_FILE)) {
    return false;
  }

  try {
    const pid = Number(fs.readFileSync(PID_FILE, 'utf8').trim());
    if (isNaN(pid)) {
      return false;
    }

    // Check if process actually exists
    try {
      process.kill(pid, 0); // Signal 0 checks if process exists
      return true;
    } catch (err) {
      // Process doesn't exist, clean up stale PID file
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
      }
      return false;
    }
  } catch (err) {
    return false;
  }
}

export function startScraper() {
  if (isRunning()) {
    throw new Error('Scraper already running');
  }

  const child = spawn(SCRAPER_CMD, SCRAPER_ARGS, {
    cwd: SCRAPER_CWD,
    stdio: 'inherit'
  });

  // Ensure PID file directory exists
  const pidDir = path.dirname(PID_FILE);
  if (!fs.existsSync(pidDir)) {
    fs.mkdirSync(pidDir, { recursive: true });
  }

  fs.writeFileSync(PID_FILE, String(child.pid));

  child.on('exit', (code, signal) => {
    // Only remove PID file if process actually exited (not if it's still running)
    setTimeout(() => {
      if (fs.existsSync(PID_FILE)) {
        try {
          // Check if process still exists before removing PID file
          process.kill(Number(fs.readFileSync(PID_FILE, 'utf8')), 0);
        } catch (err) {
          // Process doesn't exist, safe to remove PID file
          fs.unlinkSync(PID_FILE);
        }
      }
    }, 100);
  });

  child.on('error', (err) => {
    // If spawn fails, remove PID file
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
    throw err;
  });

  return child.pid;
}

export function stopScraper() {
  if (!isRunning()) {
    throw new Error('Scraper not running');
  }

  const pid = Number(fs.readFileSync(PID_FILE, 'utf8'));
  process.kill(pid, 'SIGINT');

  return pid;
}
