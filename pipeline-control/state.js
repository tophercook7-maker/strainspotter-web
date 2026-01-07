import fs from "fs";
import { join } from "path";

// Simple file lock to prevent concurrent writes
let writeLock = false;

const STATE_FILE = join(process.cwd(), "pipeline-control", "state.json");

// Initialize state file if it doesn't exist
function ensureStateFile() {
  if (!fs.existsSync(STATE_FILE)) {
    const initialState = {
      status: "idle",
      phase: "init",
      currentQuery: null,
      queryIndex: 0,
      totalQueries: 0,
      imagesFound: 0,
      lastHeartbeat: null,
      lastError: null,
      watchdog: "inactive",
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(initialState, null, 2));
  }
}

export function loadState() {
  ensureStateFile();
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

export async function updateState(patch) {
  ensureStateFile();
  const state = loadState();
  
  // Map new format to old format for backward compatibility
  const mappedPatch = {
    ...patch,
    // Sync new format fields to old format
    currentQuery: patch.currentQuery !== undefined ? patch.currentQuery : patch.current_query,
    current_query: patch.currentQuery !== undefined ? patch.currentQuery : patch.current_query,
    queriesCompleted: patch.queriesCompleted !== undefined ? patch.queriesCompleted : patch.processed_queries,
    processed_queries: patch.queriesCompleted !== undefined ? patch.queriesCompleted : patch.processed_queries,
    queriesTotal: patch.queriesTotal !== undefined ? patch.queriesTotal : patch.total_queries,
    total_queries: patch.queriesTotal !== undefined ? patch.queriesTotal : patch.total_queries,
    imagesFound: patch.imagesFound !== undefined ? patch.imagesFound : patch.images_found,
    images_found: patch.imagesFound !== undefined ? patch.imagesFound : patch.images_found,
    lastHeartbeat: patch.lastHeartbeat !== undefined ? patch.lastHeartbeat : patch.last_heartbeat,
    last_heartbeat: patch.lastHeartbeat !== undefined ? patch.lastHeartbeat : patch.last_heartbeat,
    startedAt: patch.startedAt !== undefined ? patch.startedAt : patch.startTime || patch.started_at,
    startTime: patch.startedAt !== undefined ? patch.startedAt : patch.startTime || patch.started_at,
    started_at: patch.startedAt !== undefined ? patch.startedAt : patch.startTime || patch.started_at,
    lastError: patch.lastError !== undefined ? patch.lastError : patch.last_error,
    last_error: patch.lastError !== undefined ? patch.lastError : patch.last_error,
    currentPhase: patch.currentPhase !== undefined ? patch.currentPhase : (patch.phase ? (patch.phase === "harvesting" ? "harvesting" : patch.phase === "done" ? "done" : patch.phase) : patch.current_layer),
    phase: patch.currentPhase !== undefined ? patch.currentPhase : patch.phase,
    current_layer: patch.currentPhase !== undefined ? (patch.currentPhase === "harvesting" ? "image_harvest" : patch.currentPhase === "done" ? "complete" : patch.currentPhase) : patch.current_layer,
  };
  
  // Only include fields from mappedPatch that are actually defined (not undefined)
  const cleanPatch = {};
  for (const key in mappedPatch) {
    if (mappedPatch[key] !== undefined) {
      cleanPatch[key] = mappedPatch[key];
    }
  }
  
  const updated = {
    ...state,
    ...cleanPatch,
    // Always update heartbeat and timestamp
    lastHeartbeat: cleanPatch.lastHeartbeat || state.lastHeartbeat || new Date().toISOString(),
    last_heartbeat: cleanPatch.last_heartbeat || cleanPatch.lastHeartbeat || state.last_heartbeat || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  // Ensure processed_queries/queriesCompleted never goes backwards (race condition protection)
  // ALWAYS take the maximum to prevent race conditions with concurrent workers
  if (mappedPatch.processed_queries !== undefined && state.processed_queries !== undefined && state.processed_queries !== null) {
    updated.processed_queries = Math.max(state.processed_queries, mappedPatch.processed_queries);
  } else if (mappedPatch.processed_queries !== undefined) {
    updated.processed_queries = mappedPatch.processed_queries;
  }
  
  if (mappedPatch.queriesCompleted !== undefined && state.queriesCompleted !== undefined && state.queriesCompleted !== null) {
    updated.queriesCompleted = Math.max(state.queriesCompleted, mappedPatch.queriesCompleted);
  } else if (mappedPatch.queriesCompleted !== undefined) {
    updated.queriesCompleted = mappedPatch.queriesCompleted;
  }
  
  // Also sync queriesCompleted from processed_queries if one is set and the other isn't
  if (updated.queriesCompleted === undefined || updated.queriesCompleted === null) {
    if (updated.processed_queries !== undefined && updated.processed_queries !== null) {
      updated.queriesCompleted = updated.processed_queries;
    }
  }
  if (updated.processed_queries === undefined || updated.processed_queries === null) {
    if (updated.queriesCompleted !== undefined && updated.queriesCompleted !== null) {
      updated.processed_queries = updated.queriesCompleted;
    }
  }
  
  // Always ensure totalQueries is set if we have queries
  if (updated.totalQueries === 0 && updated.total_queries > 0) {
    updated.totalQueries = updated.total_queries;
  }
  if (updated.queriesTotal === 0 && updated.total_queries > 0) {
    updated.queriesTotal = updated.total_queries;
  }
  
  // Ensure errors is always an array
  if (updated.errors !== undefined && !Array.isArray(updated.errors)) {
    if (typeof updated.errors === 'number') {
      // Convert number to array format
      updated.errors = Array(updated.errors).fill({ time: new Date().toISOString(), message: "Error occurred" });
    } else {
      updated.errors = [];
    }
  }
  
  fs.writeFileSync(STATE_FILE, JSON.stringify(updated, null, 2));
}

export function heartbeat() {
  updateState({ lastHeartbeat: new Date().toISOString() });
}
