/**
 * Electron Main Process
 * 
 * Minimal desktop wrapper for StrainSpotter web app.
 * Security best practices: contextIsolation, no nodeIntegration, no remote.
 */

const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Window state persistence
const WINDOW_STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

/**
 * Load window state from disk
 */
function loadWindowState() {
  try {
    if (fs.existsSync(WINDOW_STATE_FILE)) {
      const data = fs.readFileSync(WINDOW_STATE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('Failed to load window state:', error);
  }
  return null;
}

/**
 * Save window state to disk
 */
function saveWindowState(window) {
  try {
    const bounds = window.getBounds();
    const state = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: window.isMaximized(),
    };
    fs.writeFileSync(WINDOW_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.warn('Failed to save window state:', error);
  }
}

/**
 * Get app URL from environment
 */
function getAppUrl() {
  const url = process.env.STRAINSPOTTER_URL;
  if (url) {
    return url;
  }
  
  // Default: dev mode
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}`;
}

/**
 * Create application menu
 */
function createMenu(isDev) {
  const template = [
    {
      label: 'StrainSpotter',
      submenu: [
        { role: 'about', label: 'About StrainSpotter' },
        { type: 'separator' },
        { role: 'services', label: 'Services' },
        { type: 'separator' },
        { role: 'hide', label: 'Hide StrainSpotter' },
        { role: 'hideOthers', label: 'Hide Others' },
        { role: 'unhide', label: 'Show All' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit StrainSpotter' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Undo' },
        { role: 'redo', label: 'Redo' },
        { type: 'separator' },
        { role: 'cut', label: 'Cut' },
        { role: 'copy', label: 'Copy' },
        { role: 'paste', label: 'Paste' },
        { role: 'selectAll', label: 'Select All' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { role: 'forceReload', label: 'Force Reload' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Actual Size' },
        { role: 'zoomIn', label: 'Zoom In' },
        { role: 'zoomOut', label: 'Zoom Out' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Toggle Full Screen' },
        ...(isDev ? [
          { type: 'separator' },
          { role: 'toggleDevTools', label: 'Toggle Developer Tools' },
        ] : []),
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize', label: 'Minimize' },
        { role: 'close', label: 'Close' },
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://strainspotter.app');
          },
        },
      ],
    },
  ];

  // macOS-specific menu adjustments
  if (process.platform === 'darwin') {
    template[0].submenu = [
      { role: 'about', label: 'About StrainSpotter' },
      { type: 'separator' },
      { role: 'services', label: 'Services' },
      { type: 'separator' },
      { role: 'hide', label: 'Hide StrainSpotter' },
      { role: 'hideOthers', label: 'Hide Others' },
      { role: 'unhide', label: 'Show All' },
      { type: 'separator' },
      { role: 'quit', label: 'Quit StrainSpotter' },
    ];
  }

  return Menu.buildFromTemplate(template);
}

let mainWindow = null;

/**
 * Create main application window
 */
function createWindow() {
  const savedState = loadWindowState();
  const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

  // Icon path (macOS uses .icns, others use .png)
  const iconPath = process.platform === 'darwin'
    ? path.join(__dirname, 'assets', 'icon.icns')
    : path.join(__dirname, 'assets', 'icon.png');

  const windowOptions = {
    width: savedState?.width || 1200,
    height: savedState?.height || 800,
    x: savedState?.x,
    y: savedState?.y,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#000000',
    icon: iconPath, // App icon for dock, app switcher, window
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // Security: isolate context
      nodeIntegration: false, // Security: no node in renderer
      enableRemoteModule: false, // Security: no remote module
      sandbox: true, // Additional security
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false, // Don't show until ready
  };

  mainWindow = new BrowserWindow(windowOptions);

  // Restore maximized state if saved
  if (savedState?.isMaximized) {
    mainWindow.maximize();
  }

  // Load app URL
  const appUrl = getAppUrl();
  console.log(`[ELECTRON] Loading app from: ${appUrl}`);
  mainWindow.loadURL(appUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus window
    if (mainWindow) {
      mainWindow.focus();
    }
  });

  // Save window state on move/resize
  let saveStateTimeout;
  const saveState = () => {
    clearTimeout(saveStateTimeout);
    saveStateTimeout = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        saveWindowState(mainWindow);
      }
    }, 500);
  };

  mainWindow.on('moved', saveState);
  mainWindow.on('resized', saveState);
  mainWindow.on('maximize', saveState);
  mainWindow.on('unmaximize', saveState);

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links (open in default browser)
  // This ensures Google Maps and other external URLs open in the real browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open all external links in default browser
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Set application menu
  const menu = createMenu(isDev);
  Menu.setApplicationMenu(menu);

  // Dev tools (dev mode only)
  if (isDev) {
    // Optional: auto-open dev tools in dev mode
    // mainWindow.webContents.openDevTools();
  }
}

// App event handlers
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // macOS: Recreate window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // macOS: Keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Handle web contents events
app.on('web-contents-created', (event, contents) => {
  // Prevent new window creation (open in default browser instead)
  // This handles window.open() calls, including Google Maps links
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    // Open in default browser (Google Maps, external sites, etc.)
    shell.openExternal(navigationUrl);
  });

  // Prevent navigation to external URLs (open in default browser instead)
  // This handles direct navigation attempts to external URLs
  contents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      const appUrl = new URL(getAppUrl());

      // Allow navigation within the same origin
      if (parsedUrl.origin !== appUrl.origin) {
        event.preventDefault();
        // Open external URLs in default browser
        // This ensures Google Maps opens in the real browser with full functionality
        shell.openExternal(navigationUrl);
      }
    } catch (error) {
      // Invalid URL, prevent navigation
      event.preventDefault();
    }
  });
});
