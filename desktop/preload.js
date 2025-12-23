/**
 * Electron Preload Script
 * 
 * Secure bridge between main process and renderer.
 * Runs in isolated context with limited Node.js access.
 */

const { contextBridge } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electron', {
  // Platform info
  platform: process.platform,
  
  // Version info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
});
