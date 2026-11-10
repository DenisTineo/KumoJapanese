const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');

const APP_ID = 'com.kumojapanese.desktop';
const PROGRESS_FILE = 'learning-progress.json';
const TRANSLATION_ENDPOINT = 'https://api.mymemory.translated.net/get';
const TRANSLATION_TIMEOUT_MS = 15000;
const MAX_TRANSLATION_BYTES = 500;
const SUPPORTED_SOURCE_LANGUAGES = new Set(['en', 'es', 'pt', 'fr', 'de', 'it']);
const RENDERER_PATH = path.join(__dirname, 'src', 'index.html');
const RENDERER_URL = pathToFileURL(RENDERER_PATH).href;
let mainWindow;
let allowWindowClose = false;
let closeRequested = false;
let progressWriteQueue = Promise.resolve();

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.setAppUserModelId(APP_ID);

function progressPath() {
  return path.join(app.getPath('userData'), PROGRESS_FILE);
}

async function parseProgressFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
}

async function readProgressFile(filePath = progressPath()) {
  const candidates = [filePath, `${filePath}.tmp`, `${filePath}.bak`];
  for (const candidate of candidates) {
    try {
      const value = await parseProgressFile(candidate);
      if (value) return value;
    } catch (error) {
      if (error.code !== 'ENOENT') console.error(`Unable to read progress candidate ${path.basename(candidate)}:`, error.message);
    }
  }
  return null;
}

async function commitProgressFile(serialized, filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  const backupPath = `${filePath}.bak`;
  let movedOriginal = false;

  await fs.writeFile(temporaryPath, serialized, 'utf8');
  await fs.rm(backupPath, { force: true });
  try {
    await fs.rename(filePath, backupPath);
    movedOriginal = true;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      await fs.rm(temporaryPath, { force: true });
      throw error;
    }
  }

  try {
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    if (movedOriginal) await fs.rename(backupPath, filePath).catch(() => {});
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }

  await fs.rm(backupPath, { force: true });
  return true;
}

function writeProgressFile(value, filePath = progressPath()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return Promise.reject(new TypeError('Progress must be an object.'));
  }

  const serialized = JSON.stringify(value, null, 2);
  if (Buffer.byteLength(serialized, 'utf8') > 5 * 1024 * 1024) {
    return Promise.reject(new RangeError('Progress data is unexpectedly large.'));
  }

  const operation = progressWriteQueue.catch(() => {}).then(() => commitProgressFile(serialized, filePath));
  progressWriteQueue = operation.catch(() => {});
  return operation;
}

function isTrustedSender(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents) return false;
  return event.senderFrame === event.sender.mainFrame && event.senderFrame?.url === RENDERER_URL;
}

function isTrustedRenderer(webContents) {
  return Boolean(mainWindow && webContents === mainWindow.webContents && !webContents.isDestroyed() && webContents.getURL() === RENDERER_URL);
}

function configureMediaPermissions(webContents) {
  const browserSession = webContents.session;
  browserSession.setPermissionCheckHandler((requestingContents, permission, _origin, details) => {
    if (permission !== 'media' || !isTrustedRenderer(requestingContents)) return false;
    return !details?.mediaType || details.mediaType === 'audio' || details.mediaType === 'unknown';
  });
  browserSession.setPermissionRequestHandler((requestingContents, permission, callback, details) => {
    if (permission !== 'media' || !isTrustedRenderer(requestingContents)) {
      callback(false);
      return;
    }
    const mediaTypes = Array.isArray(details?.mediaTypes) ? details.mediaTypes : [];
    const requestsAudio = mediaTypes.length === 0 || mediaTypes.includes('audio');
    callback(requestsAudio && !mediaTypes.includes('video'));
  });
}

function decodeTranslationEntities(value) {
  const namedEntities = {
    amp: '&',
    apos: "'",
    '#39': "'",
    quot: '"',
    lt: '<',
    gt: '>'
  };

  return String(value)
    .replace(/&(#\d+|#x[\da-f]+|amp|apos|#39|quot|lt|gt);/gi, (match, entity) => {
      if (entity.startsWith('#x')) {
        const codePoint = Number.parseInt(entity.slice(2), 16);
        return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : match;
      }
      if (entity.startsWith('#') && entity !== '#39') {
        const codePoint = Number.parseInt(entity.slice(1), 10);
        return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : match;
      }
      return namedEntities[entity.toLowerCase()] ?? match;
    })
    .trim();
}

async function translateToJapanese(payload) {
  const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
  const sourceLanguage = typeof payload?.sourceLanguage === 'string' ? payload.sourceLanguage : 'en';

  if (!text) return { ok: false, error: 'Type a sentence before translating it.' };
  if (!SUPPORTED_SOURCE_LANGUAGES.has(sourceLanguage)) {
    return { ok: false, error: 'That source language is not supported.' };
  }
  if (Buffer.byteLength(text, 'utf8') > MAX_TRANSLATION_BYTES) {
    return { ok: false, error: 'The sentence is too long. Keep it at 500 bytes or fewer.' };
  }

  const url = new URL(TRANSLATION_ENDPOINT);
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', `${sourceLanguage}|ja`);
  url.searchParams.set('mt', '1');

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': `Kumo-Japanese/${app.getVersion()}` },
      signal: AbortSignal.timeout(TRANSLATION_TIMEOUT_MS)
    });

    if (!response.ok) {
      if (response.status === 429) return { ok: false, error: 'The translation service is busy or its daily limit was reached. Try again later.' };
      return { ok: false, error: `The translation service returned an error (${response.status}).` };
    }

    const data = await response.json();
    const status = Number(data?.responseStatus ?? response.status);
    const translation = decodeTranslationEntities(data?.responseData?.translatedText || '');

    if (status >= 400 || !translation) {
      const details = typeof data?.responseDetails === 'string' ? data.responseDetails.trim() : '';
      return { ok: false, error: details || 'No Japanese translation was returned. Try a different sentence.' };
    }

    return { ok: true, translation, provider: 'MyMemory' };
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return { ok: false, error: 'Translation timed out. Check your internet connection and try again.' };
    }
    console.error('Translation request failed:', error?.message || error);
    return { ok: false, error: 'Could not reach the translation service. Check your internet connection and try again.' };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1040,
    minHeight: 700,
    show: false,
    backgroundColor: '#f7f7f5',
    title: 'Kumo Japanese',
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#ffffff',
      symbolColor: '#3c3c3c',
      height: 44
    },
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
    }
  });

  allowWindowClose = false;
  closeRequested = false;
  configureMediaPermissions(mainWindow.webContents);
  mainWindow.loadFile(RENDERER_PATH);
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== RENDERER_URL) event.preventDefault();
  });

  mainWindow.on('close', (event) => {
    if (allowWindowClose || mainWindow.webContents.isDestroyed()) return;
    event.preventDefault();
    if (closeRequested) return;
    closeRequested = true;
    mainWindow.webContents.send('app:before-close');
  });

  mainWindow.on('closed', () => {
    closeRequested = false;
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  if (!hasSingleInstanceLock) return;
  Menu.setApplicationMenu(null);

  ipcMain.handle('progress:load', (event) => {
    if (!isTrustedSender(event)) return null;
    return readProgressFile();
  });

  ipcMain.handle('progress:save', (event, value) => {
    if (!isTrustedSender(event)) return false;
    return writeProgressFile(value);
  });

  ipcMain.handle('progress:export', async (event, value) => {
    if (!isTrustedSender(event)) return { canceled: true };
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Kumo learning progress',
      defaultPath: `kumo-progress-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON files', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    await writeProgressFile(value, result.filePath);
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle('progress:import', async (event) => {
    if (!isTrustedSender(event)) return { canceled: true };
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Kumo learning progress',
      properties: ['openFile'],
      filters: [{ name: 'JSON files', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const value = await readProgressFile(result.filePaths[0]);
    if (!value) return { canceled: false, error: 'That file does not contain valid Kumo progress.' };
    await writeProgressFile(value);
    return { canceled: false, value };
  });

  ipcMain.handle('translation:to-japanese', (event, payload) => {
    if (!isTrustedSender(event)) return { ok: false, error: 'Translation request rejected.' };
    return translateToJapanese(payload);
  });

  ipcMain.handle('app:open-microphone-settings', async (event) => {
    if (!isTrustedSender(event)) return false;
    await shell.openExternal('ms-settings:privacy-microphone');
    return true;
  });

  ipcMain.on('app:close-ready', (event) => {
    if (!isTrustedSender(event)) return;
    allowWindowClose = true;
    closeRequested = false;
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
  });

  ipcMain.handle('app:version', (event) => isTrustedSender(event) ? app.getVersion() : '');

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
