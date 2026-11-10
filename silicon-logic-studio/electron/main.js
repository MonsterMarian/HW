import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logFile = path.join(__dirname, '../electron-debug.log');

function log(msg) {
  try {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) {}
}

let mainWindow = null;

function createWindow() {
  log('Creating BrowserWindow...');
  mainWindow = new BrowserWindow({
    width: 1540,
    height: 960,
    minWidth: 1200,
    minHeight: 750,
    frame: false, // Borderless custom cyber window
    titleBarStyle: 'hidden',
    backgroundColor: '#07080A',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    log(`CONSOLE [lvl ${level}] ${message} (${sourceId}:${line})`);
  });

  // Odkazy na obchody (ECONOMIC view) otevřít v systémovém prohlížeči, ne v novém okně aplikace
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    log(`FAIL LOAD: ${errorCode} ${errorDescription} URL: ${validatedURL}`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log('FINISH LOAD SUCCESS');
  });

  // Try localhost:5173 first if active (for instant HMR/updates), fallback to dist/index.html
  fetch('http://localhost:5173')
    .then(() => {
      log('Loading URL http://localhost:5173');
      mainWindow.loadURL('http://localhost:5173');
    })
    .catch(() => {
      log('Localhost not reachable, loading dist/index.html');
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    });

  // Window control IPC
  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
