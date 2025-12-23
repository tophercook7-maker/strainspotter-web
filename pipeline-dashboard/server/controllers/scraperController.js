import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const VAULT_ROOT = '/Volumes/TheVault';
const DATASET_ROOT = path.join(VAULT_ROOT, 'StrainSpotter-Dataset');
const PID_FILE = path.join(DATASET_ROOT, 'scraper.pid');
const STATE_FILE = path.join(process.env.HOME || '', 'strainspotter_scraper', 'scraper_state.json');
const SCRAPER_SCRIPT = path.join(process.env.HOME || '', 'strainspotter_scraper', 'run-scraper.mjs');
const LOG_FILE = path.join(DATASET_ROOT, 'scraper-controller.log');
const PIPELINE_LOG = path.join(DATASET_ROOT, 'pipeline.log');

// Configured resources (MANDATORY - must match scraper config)
const CONFIGURED_RESOURCES = [
  'google_images_bud',
  'google_images_packaging',
];

function log(message) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}\n`;
  try {
    // Ensure log directory exists
    const logDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(LOG_FILE, entry);
  } catch (err) {
    console.error('[CONTROLLER] Failed to write log:', err);
  }
  console.log(`[CONTROLLER] ${message}`);
}

function pipelineLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level,
    message,
    ...(data && { data }),
  };
  const line = JSON.stringify(entry) + '\n';
  try {
    if (!fs.existsSync(DATASET_ROOT)) {
      fs.mkdirSync(DATASET_ROOT, { recursive: true });
    }
    fs.appendFileSync(PIPELINE_LOG, line);
  } catch (err) {
    console.error('[CONTROLLER] Failed to write pipeline.log:', err);
  }
}

function isVaultMounted() {
  return fs.existsSync(VAULT_ROOT) && fs.existsSync(DATASET_ROOT);
}

function validateStateWrapper() {
  if (!fs.existsSync(STATE_FILE)) {
    return { valid: true, state: null }; // Will be initialized by scraper
  }

  try {
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const errors = [];
    
    if (typeof raw.current !== 'number') errors.push('current missing or not a number');
    if (!('strain_name' in raw)) errors.push('strain_name missing');
    if (typeof raw.state !== 'object' || raw.state === null) errors.push('state missing');

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, state: raw };
  } catch (err) {
    return { valid: false, errors: [`Failed to parse: ${err.message}`] };
  }
}

function isScraperRunning() {
  if (!fs.existsSync(PID_FILE)) {
    return false;
  }

  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
    if (isNaN(pid)) {
      return false;
    }

    // Check if process exists
    try {
      process.kill(pid, 0); // Signal 0 checks if process exists
      return true;
    } catch (err) {
      // Process doesn't exist, clean up stale PID file
      fs.unlinkSync(PID_FILE);
      return false;
    }
  } catch (err) {
    return false;
  }
}

function getScraperPID() {
  if (!fs.existsSync(PID_FILE)) {
    return null;
  }
  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

function atomicWriteState(state) {
  const tmpPath = STATE_FILE + '.tmp';
  const stateDir = path.dirname(STATE_FILE);
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2));
  fs.renameSync(tmpPath, STATE_FILE);
}

function getActiveResources() {
  // Determine which resources are currently being scraped based on state
  const active = [];
  
  if (!fs.existsSync(STATE_FILE)) {
    return active;
  }

  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const innerState = state.state || {};
    const currentStrain = state.strain_name;
    
    // Check if strain is in progress and which resources are being processed
    if (currentStrain && innerState.resources_by_strain && innerState.resources_by_strain[currentStrain]) {
      const strainResources = innerState.resources_by_strain[currentStrain];
      // If resource is in progress but not completed, it's active
      for (const resource of CONFIGURED_RESOURCES) {
        if (strainResources[resource] && !strainResources[resource].completed) {
          active.push(resource);
        }
      }
    }
    
    // If no active resources detected but scraper is running, assume first resource is active
    if (active.length === 0 && state.current !== undefined && isScraperRunning()) {
      // Check which resources haven't been completed for current strain
      if (currentStrain && innerState.resources_by_strain && innerState.resources_by_strain[currentStrain]) {
        const strainResources = innerState.resources_by_strain[currentStrain];
        for (const resource of CONFIGURED_RESOURCES) {
          if (!strainResources[resource] || !strainResources[resource].completed) {
            active.push(resource);
            break; // Only mark first incomplete resource as active
          }
        }
      } else {
        // No resource tracking yet, default to first configured resource
        active.push(CONFIGURED_RESOURCES[0]);
      }
    }
  } catch (err) {
    // Ignore parse errors, return empty
  }

  return active;
}

function getCompletedResources() {
  // Track which resources have been explicitly exercised based on state
  const completed = [];
  
  if (!fs.existsSync(STATE_FILE)) {
    return completed;
  }

  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const innerState = state.state || {};
    const resourcesExercised = innerState.resources_exercised || {};
    
    // Only include resources that have been explicitly exercised
    for (const resource of CONFIGURED_RESOURCES) {
      if (resourcesExercised[resource] === true) {
        completed.push(resource);
      }
    }
  } catch (err) {
    // Ignore parse errors
  }

  return completed;
}

export async function startScraper() {
  log('START request received');

  // Precondition 1: TheVault mounted
  if (!isVaultMounted()) {
    const error = 'TheVault is not mounted or dataset root missing';
    log(`START failed: ${error}`);
    throw new Error(error);
  }

  // Precondition 2: scraper_state.json wrapper valid OR initialize clean wrapper
  const stateCheck = validateStateWrapper();
  if (!stateCheck.valid) {
    // Try to initialize clean wrapper if state file is missing
    if (!fs.existsSync(STATE_FILE)) {
      log('Initializing clean scraper_state.json wrapper');
      const STRAIN_LIST_PATH = path.join(VAULT_ROOT, 'full_strains_35000.txt');
      if (!fs.existsSync(STRAIN_LIST_PATH)) {
        const error = 'Cannot initialize state: strain list not found';
        log(`START failed: ${error}`);
        throw new Error(error);
      }
      const strains = fs.readFileSync(STRAIN_LIST_PATH, 'utf8').split(/\r?\n/).filter(Boolean);
      const cleanState = {
        current: 0,
        strain_name: null,
        state: {
          initialized_at: new Date().toISOString(),
          total: strains.length,
          resources_exercised: {},
          resources_by_strain: {},
        }
      };
      atomicWriteState(cleanState);
      log('Initialized clean state wrapper');
    } else {
      // State file exists but is invalid
      const error = `Invalid scraper_state.json: ${stateCheck.errors.join(', ')}`;
      log(`START failed: ${error}`);
      pipelineLog('error', 'start failed', { reason: 'invalid_state', errors: stateCheck.errors });
      throw new Error(error);
    }
  }

  // Check resource coverage if state exists and has progress
  if (stateCheck.valid && stateCheck.state && stateCheck.state.current > 0) {
    const resourcesExercised = stateCheck.state.resources_exercised || {};
    const missing = CONFIGURED_RESOURCES.filter(r => !resourcesExercised[r]);
    if (missing.length > 0) {
      const error = `FAILURE: Configured resources never exercised: ${missing.join(', ')}`;
      log(`START failed: ${error}`);
      pipelineLog('error', 'resource coverage failure', { missing_resources: missing });
      throw new Error(error);
    }
  }

  // Precondition 3: No scraper.pid present
  if (fs.existsSync(PID_FILE)) {
    // Check if process is actually running
    if (isScraperRunning()) {
      const error = 'Scraper is already running (PID file exists and process is active)';
      log(`START failed: ${error}`);
      throw new Error(error);
    } else {
      // Stale PID file, remove it
      log('Removing stale PID file');
      fs.unlinkSync(PID_FILE);
    }
  }

  if (!fs.existsSync(SCRAPER_SCRIPT)) {
    const error = `Scraper script not found at ${SCRAPER_SCRIPT}`;
    log(`START failed: ${error}`);
    throw new Error(error);
  }

  // Spawn scraper as child process
  const child = spawn('node', [SCRAPER_SCRIPT], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  const pid = child.pid;

  // Write PID file atomically
  const tmpPidFile = PID_FILE + '.tmp';
  fs.writeFileSync(tmpPidFile, String(pid));
  fs.renameSync(tmpPidFile, PID_FILE);

  // Handle child process events
  child.stdout.on('data', (data) => {
    process.stdout.write(`[SCRAPER ${pid}] ${data}`);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(`[SCRAPER ${pid}] ${data}`);
  });

  child.on('exit', (code, signal) => {
    log(`Scraper process ${pid} exited with code ${code}, signal ${signal}`);
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  });

  child.on('error', (err) => {
    log(`Scraper process ${pid} error: ${err.message}`);
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  });

  log(`Scraper started with PID ${pid}`);
  pipelineLog('info', 'scraper start', { pid, resources: CONFIGURED_RESOURCES });

  return {
    started: true,
    pid,
  };
}

export async function stopScraper() {
  log('STOP request received');

  // Precondition: scraper.pid exists
  if (!fs.existsSync(PID_FILE)) {
    const error = 'Scraper PID file not found (scraper may not be running)';
    log(`STOP failed: ${error}`);
    throw new Error(error);
  }

  const pid = getScraperPID();
  if (!pid) {
    const error = 'Could not read scraper PID from file';
    log(`STOP failed: ${error}`);
    throw new Error(error);
  }

  // Verify process is actually running
  try {
    process.kill(pid, 0);
  } catch (err) {
    // Process doesn't exist, clean up stale PID file
    fs.unlinkSync(PID_FILE);
    const error = 'Scraper process not found (stale PID file)';
    log(`STOP failed: ${error}`);
    throw new Error(error);
  }

  log(`Sending SIGINT to scraper process ${pid}`);

  try {
    // Send SIGINT for graceful shutdown
    process.kill(pid, 'SIGINT');

    // Wait for clean exit (state checkpoint written)
    // Check both process exit AND state file update
    const maxWait = 30000;
    const checkInterval = 500;
    const startTime = Date.now();
    let lastStateModified = fs.existsSync(STATE_FILE) ? fs.statSync(STATE_FILE).mtimeMs : 0;

    return new Promise((resolve, reject) => {
      const checkExit = setInterval(() => {
        try {
          process.kill(pid, 0); // Check if process still exists
        } catch (err) {
          // Process exited - verify state was checkpointed
          clearInterval(checkExit);
          
          // Give a small window for state file to be written
          setTimeout(() => {
            if (fs.existsSync(STATE_FILE)) {
              const newStateModified = fs.statSync(STATE_FILE).mtimeMs;
              if (newStateModified > lastStateModified || newStateModified > startTime) {
                log(`Scraper stopped gracefully (PID ${pid}), state checkpointed`);
              } else {
                log(`Scraper stopped (PID ${pid}), but state may not have been checkpointed`);
              }
            }
            
            if (fs.existsSync(PID_FILE)) {
              fs.unlinkSync(PID_FILE);
            }
            
            pipelineLog('info', 'scraper stop', { pid });
            resolve({ stopped: true });
          }, 1000);
        }

        if (Date.now() - startTime > maxWait) {
          clearInterval(checkExit);
          const error = 'Scraper did not exit within timeout (30s)';
          log(`STOP failed: ${error}`);
          reject(new Error(error));
        }
      }, checkInterval);
    });
  } catch (err) {
    const error = `Failed to stop scraper: ${err.message}`;
    log(`STOP failed: ${error}`);
    throw new Error(error);
  }
}

export function getScraperStatus() {
  const running = isScraperRunning();
  const pid = getScraperPID();
  
  let current = null;
  let strain_name = null;
  let state_valid = false;

  const stateCheck = validateStateWrapper();
  state_valid = stateCheck.valid;

  if (stateCheck.valid && stateCheck.state) {
    current = stateCheck.state.current;
    strain_name = stateCheck.state.strain_name;
  }

  const activeResources = getActiveResources();
  const completedResources = getCompletedResources();

  // Validate resource coverage - FAILURE if configured resource never exercised
  const allExercised = CONFIGURED_RESOURCES.every(r => completedResources.includes(r));
  if (!allExercised && current > 0) {
    const missing = CONFIGURED_RESOURCES.filter(r => !completedResources.includes(r));
    pipelineLog('error', 'resource coverage failure', { missing_resources: missing });
  }

  return {
    running,
    pid,
    current,
    strain_name,
    state_valid,
    resources: {
      configured: CONFIGURED_RESOURCES,
      active: activeResources,
      completed: completedResources,
    },
  };
}

export function sampleStrainsForAudit(count) {
  const STRAIN_LIST_PATH = path.join(VAULT_ROOT, 'full_strains_35000.txt');

  if (!fs.existsSync(STRAIN_LIST_PATH)) {
    throw new Error(`Strain list not found at ${STRAIN_LIST_PATH}`);
  }

  // Get completed strains from state
  const stateCheck = validateStateWrapper();
  if (!stateCheck.valid || !stateCheck.state) {
    throw new Error('Cannot sample: scraper state is invalid or missing');
  }

  const completedIndex = stateCheck.state.current || 0;
  if (completedIndex === 0) {
    throw new Error('No completed strains to sample (scraper has not processed any strains yet)');
  }

  const raw = fs.readFileSync(STRAIN_LIST_PATH, 'utf8');
  const allStrains = raw.split(/\r?\n/).filter(Boolean);

  // Only sample from completed strains (indices 0 to completedIndex - 1)
  const completedStrains = allStrains.slice(0, completedIndex);

  if (completedStrains.length === 0) {
    throw new Error('No completed strains available for sampling');
  }

  if (count > completedStrains.length) {
    count = completedStrains.length;
  }

  // Random sampling without replacement from completed strains only
  const sampled = [];
  const indices = new Set();
  
  while (sampled.length < count) {
    const randomIndex = Math.floor(Math.random() * completedStrains.length);
    if (!indices.has(randomIndex)) {
      indices.add(randomIndex);
      const strainSlug = completedStrains[randomIndex];
      
      // Get paths and counts for this strain
      const strainData = getStrainData(strainSlug, stateCheck.state);
      
      sampled.push({
        strain: strainSlug,
        paths: strainData.paths,
        counts: strainData.counts,
      });
    }
  }

  log(`Audit sample requested: ${count} strains selected from ${completedStrains.length} completed strains`);
  pipelineLog('info', 'audit sample', { count, strains: sampled.map(s => s.strain) });

  return sampled;
}

function getStrainData(strainSlug, state) {
  const budDir = path.join(DATASET_ROOT, strainSlug, 'buds');
  const packagingDir = path.join(DATASET_ROOT, strainSlug, 'packaging');
  const heroPath = path.join(DATASET_ROOT, 'AI-Hero-Images', `${strainSlug}.png`);
  const heroPathJpg = path.join(DATASET_ROOT, 'AI-Hero-Images', `${strainSlug}.jpg`);

  // Get bud images
  const budImages = [];
  if (fs.existsSync(budDir)) {
    try {
      const files = fs.readdirSync(budDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
      budImages.push(...files.map(f => path.join(budDir, f)));
    } catch (err) {
      // Ignore read errors
    }
  }

  // Get packaging images
  const packagingImages = [];
  if (fs.existsSync(packagingDir)) {
    try {
      const files = fs.readdirSync(packagingDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
      packagingImages.push(...files.map(f => path.join(packagingDir, f)));
    } catch (err) {
      // Ignore read errors
    }
  }

  // Check for hero image
  const hasHero = fs.existsSync(heroPath) || fs.existsSync(heroPathJpg);

  // Get counts from state if available
  let budCount = budImages.length;
  let packagingCount = packagingImages.length;
  
  if (state.resources_by_strain && state.resources_by_strain[strainSlug]) {
    const strainResources = state.resources_by_strain[strainSlug];
    if (strainResources.google_images_bud && strainResources.google_images_bud.imagesScraped !== undefined) {
      budCount = strainResources.google_images_bud.imagesScraped;
    }
    if (strainResources.google_images_packaging && strainResources.google_images_packaging.imagesScraped !== undefined) {
      packagingCount = strainResources.google_images_packaging.imagesScraped;
    }
  }

  return {
    paths: {
      bud_images: budImages,
      packaging_images: packagingImages,
      hero_image: hasHero,
    },
    counts: {
      bud: budCount,
      packaging: packagingCount,
    },
  };
}
