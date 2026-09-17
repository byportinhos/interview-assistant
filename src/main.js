const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// load .env from dev cwd or from packaged resources
const envCandidates = [
  path.join(process.cwd(), '.env'),
  process.resourcesPath ? path.join(process.resourcesPath, '.env') : null,
  path.join(__dirname, '..', '..', '.env'),
].filter(Boolean);
for (const p of envCandidates) {
  if (fs.existsSync(p)) { require('dotenv').config({ path: p }); break; }
}

const { execFile } = require('child_process');
const { dialog } = require('electron');
const { startCapture, stopCapture } = require('./audio/capture');
const { transcribeChunk } = require('./audio/whisper');
const { suggestStream, parseBlocks, setProfile } = require('./llm/deepseek');

const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');
function loadSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')); } catch { return {}; }
}
function saveSettings(s) {
  try { fs.writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2)); } catch (e) { console.error(e); }
}
let settings = loadSettings();
if (settings.device) process.env.AUDIO_DEVICE = settings.device;
if (settings.profile) setProfile(settings.profile);

function listAudioInputs() {
  return new Promise((resolve) => {
    execFile('/usr/sbin/system_profiler', ['SPAudioDataType', '-json'], { maxBuffer: 8 * 1024 * 1024 }, (err, stdout) => {
      if (err) return resolve([]);
      try {
        const data = JSON.parse(stdout);
        const items = data.SPAudioDataType?.[0]?._items || [];
        const names = [];
        for (const it of items) {
          const inCh = it.coreaudio_device_input || it['coreaudio_device_input '] || 0;
          if (Number(inCh) > 0) names.push(it._name);
        }
        resolve(names);
      } catch { resolve([]); }
    });
  });
}

let win;
let capturing = false;
let processing = false;
const queue = [];

// rolling transcript buffer: last ~60s worth of chunks
const transcriptBuffer = []; // { t: ms, text: string }
const BUFFER_MS = 60_000;

function pushTranscript(text) {
  const now = Date.now();
  transcriptBuffer.push({ t: now, text });
  while (transcriptBuffer.length && now - transcriptBuffer[0].t > BUFFER_MS) {
    transcriptBuffer.shift();
  }
}

function currentContext() {
  return transcriptBuffer.map(x => x.text).join(' ');
}

function createWindow() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width: 520,
    height: 820,
    x: width - 540,
    y: 40,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setContentProtection(true); // hide from screen capture
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

let suggestTimer = null;
let suggestAbort = null;
const SUGGEST_DEBOUNCE_MS = 1200;

function scheduleSuggest() {
  if (suggestTimer) clearTimeout(suggestTimer);
  suggestTimer = setTimeout(runSuggest, SUGGEST_DEBOUNCE_MS);
}

async function runSuggest() {
  const context = currentContext();
  if (!context.trim()) return;
  if (suggestAbort) suggestAbort.abort();
  const ctrl = new AbortController();
  suggestAbort = ctrl;
  try {
    await suggestStream(context, (fullText) => {
      if (ctrl.signal.aborted) return;
      win.webContents.send('suggestion', parseBlocks(fullText));
    }, ctrl.signal);
  } catch (e) {
    if (e.name !== 'AbortError') console.error('[suggest]', e);
  }
}

async function processChunk(wavPath) {
  try {
    const englishText = await transcribeChunk(wavPath, (rms) => {
      if (win) win.webContents.send('level', rms);
    });
    if (!englishText || englishText.trim().length < 3) return;

    pushTranscript(englishText);
    win.webContents.send('transcript', currentContext());
    scheduleSuggest();
  } catch (e) {
    console.error('[processChunk]', e);
    win.webContents.send('error', String(e.message || e));
  }
}

async function drain() {
  if (processing) return;
  processing = true;
  while (queue.length) {
    // keep only latest 2 chunks — drop older backlog
    while (queue.length > 2) queue.shift();
    const next = queue.shift();
    await processChunk(next);
  }
  processing = false;
}

function handleChunk(wavPath) {
  queue.push(wavPath);
  drain();
}

ipcMain.handle('quit', () => { app.quit(); });

ipcMain.handle('list-devices', async () => {
  const devices = await listAudioInputs();
  return { devices, current: settings.device || 'BlackHole 2ch' };
});

ipcMain.handle('clear-context', async () => {
  transcriptBuffer.length = 0;
  return { ok: true };
});

ipcMain.handle('upload-profile', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Selecione currículo / perfil',
    properties: ['openFile'],
    filters: [{ name: 'Docs', extensions: ['pdf', 'txt', 'md', 'docx'] }],
  });
  if (res.canceled || !res.filePaths[0]) return { ok: false };
  const filePath = res.filePaths[0];
  const ext = path.extname(filePath).toLowerCase();
  let text = '';
  try {
    if (ext === '.pdf') {
      const pdf = require('pdf-parse/lib/pdf-parse.js');
      const buf = fs.readFileSync(filePath);
      const data = await pdf(buf);
      text = data.text || '';
    } else if (ext === '.docx') {
      const mammoth = require('mammoth');
      const { value } = await mammoth.extractRawText({ path: filePath });
      text = value || '';
    } else {
      text = fs.readFileSync(filePath, 'utf8');
    }
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
  text = text.replace(/\s+/g, ' ').trim().slice(0, 8000);
  settings.profile = text;
  settings.profileName = path.basename(filePath);
  saveSettings(settings);
  setProfile(text);
  return { ok: true, name: settings.profileName, chars: text.length };
});

ipcMain.handle('get-profile-info', async () => {
  return { name: settings.profileName || null, chars: (settings.profile || '').length };
});

ipcMain.handle('clear-profile', async () => {
  delete settings.profile;
  delete settings.profileName;
  saveSettings(settings);
  setProfile('');
  return { ok: true };
});

ipcMain.handle('save-device', async (_e, name) => {
  settings.device = name;
  process.env.AUDIO_DEVICE = name;
  saveSettings(settings);
  if (capturing) {
    await stopCapture();
    await startCapture(handleChunk);
  }
  return { ok: true };
});

ipcMain.handle('toggle-capture', async () => {
  if (capturing) {
    await stopCapture();
    capturing = false;
    return { capturing: false };
  } else {
    await startCapture(handleChunk);
    capturing = true;
    return { capturing: true };
  }
});

app.whenReady().then(() => {
  createWindow();

  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (!win) return;
    win.isVisible() ? win.hide() : win.show();
  });

  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    win.webContents.send('hotkey-toggle');
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (capturing) stopCapture();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
