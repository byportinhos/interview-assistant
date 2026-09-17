const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const execFileP = promisify(execFile);

const IS_WIN = process.platform === 'win32';
function findWhisperBin() {
  if (process.env.WHISPER_BIN) return process.env.WHISPER_BIN;
  const candidates = IS_WIN
    ? [
        'C:\\whisper\\whisper-cli.exe',
        'C:\\whisper\\main.exe',
        'whisper-cli.exe',
        'main.exe',
      ]
    : [
        '/opt/homebrew/bin/whisper-cli',
        '/usr/local/bin/whisper-cli',
      ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return IS_WIN ? 'whisper-cli.exe' : 'whisper-cli';
}
const WHISPER_BIN = findWhisperBin();

const WHISPER_LANG = process.env.WHISPER_LANG || 'pt';

function resolveModelPath() {
  if (process.env.WHISPER_MODEL_PATH) return process.env.WHISPER_MODEL_PATH;
  const names = WHISPER_LANG === 'en'
    ? ['ggml-tiny.en.bin', 'ggml-base.en.bin']
    : ['ggml-base.bin', 'ggml-small.bin'];
  const dirs = [
    path.join(__dirname, '..', '..', 'models'),
    process.resourcesPath ? path.join(process.resourcesPath, 'models') : null,
  ].filter(Boolean);
  for (const d of dirs) for (const n of names) {
    const p = path.join(d, n);
    if (fs.existsSync(p)) return p;
  }
  return path.join(dirs[0], names[0]);
}
const MODEL_PATH = resolveModelPath();

const HALLUCINATIONS = new Set([
  'you', 'thank you', 'thanks', 'bye', 'bye.', 'thank you.', '.',
  '[blank_audio]', '(silence)', '[silence]', '[music]', '(music)',
  '[applause]', '(applause)', 'okay', 'ok', 'yeah',
  'obrigado', 'obrigada', 'obrigado.', 'muito obrigado', 'legendado pela comunidade amara.org',
  'legendas pela comunidade amara.org', 'legendas: amara.org', 'tchau', 'tchau.',
]);

function isHallucination(text) {
  const t = text.toLowerCase().replace(/[\s\.,!?]+$/g, '').trim();
  if (!t || t.length < 3) return true;
  if (HALLUCINATIONS.has(t)) return true;
  if (/amara\.org/i.test(t)) return true;
  return false;
}

// Simple RMS over PCM16 mono to detect near-silence
function rmsFromWav(wavPath) {
  try {
    const buf = fs.readFileSync(wavPath);
    // find 'data' chunk
    let i = 12;
    while (i < buf.length - 8) {
      const id = buf.toString('ascii', i, i + 4);
      const size = buf.readUInt32LE(i + 4);
      if (id === 'data') { i += 8; break; }
      i += 8 + size;
    }
    if (i >= buf.length) return 0;
    let sum = 0, n = 0;
    for (let p = i; p + 1 < buf.length; p += 2) {
      const s = buf.readInt16LE(p);
      sum += s * s;
      n++;
    }
    if (!n) return 0;
    return Math.sqrt(sum / n);
  } catch { return 0; }
}

async function transcribeChunk(wavPath, onLevel) {
  if (!fs.existsSync(wavPath)) return '';
  if (!fs.existsSync(MODEL_PATH)) {
    console.error('[whisper] model missing:', MODEL_PATH);
    return '';
  }

  const rms = rmsFromWav(wavPath);
  console.log(`[whisper] rms=${rms.toFixed(1)}`);
  if (onLevel) onLevel(rms);
  if (rms < 8) {
    try { fs.unlinkSync(wavPath); } catch {}
    return '';
  }

  try {
    const { stdout } = await execFileP(WHISPER_BIN, [
      '-m', MODEL_PATH,
      '-f', wavPath,
      '-l', WHISPER_LANG,
      '-nt',
      '--no-prints',
      '-t', '4',
    ], { maxBuffer: 10 * 1024 * 1024 });

    try { fs.unlinkSync(wavPath); } catch {}

    const text = stdout.trim().replace(/\s+/g, ' ');
    console.log(`[whisper] raw="${text}"`);
    if (isHallucination(text)) return '';
    return text;
  } catch (e) {
    console.error('[whisper] error', e.message);
    try { fs.unlinkSync(wavPath); } catch {}
    return '';
  }
}

module.exports = { transcribeChunk };
