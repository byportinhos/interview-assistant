const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const TMP_DIR = path.join(os.tmpdir(), 'interview-assistant');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const IS_WIN = process.platform === 'win32';

function findSox() {
  if (process.env.SOX_BIN) return process.env.SOX_BIN;
  const candidates = IS_WIN
    ? [
        'C:\\Program Files (x86)\\sox-14-4-2\\sox.exe',
        'C:\\Program Files\\sox-14-4-2\\sox.exe',
        'sox.exe',
      ]
    : ['/opt/homebrew/bin/sox', '/usr/local/bin/sox', '/usr/bin/sox'];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return IS_WIN ? 'sox.exe' : 'sox';
}
const SOX_BIN = findSox();

const CHUNK_SECONDS = 2.5;
const SAMPLE_RATE = 16000;

function currentDevice() {
  if (process.env.AUDIO_DEVICE) return process.env.AUDIO_DEVICE;
  return IS_WIN ? 'CABLE Output (VB-Audio Virtual Cable)' : 'BlackHole 2ch';
}

function inputTypeArgs() {
  if (IS_WIN) {
    // waveaudio uses device NAME on Windows
    return ['-t', 'waveaudio', currentDevice()];
  }
  return ['-t', 'coreaudio', currentDevice()];
}

let recording = null;
let rotateTimer = null;
let currentPath = null;
let currentStream = null;
let onChunkCb = null;

function newChunkPath() {
  return path.join(TMP_DIR, `chunk-${Date.now()}.wav`);
}

function startChunk() {
  currentPath = newChunkPath();
  currentStream = fs.createWriteStream(currentPath);

  const sox = spawn(SOX_BIN, [
    ...inputTypeArgs(),
    '-r', String(SAMPLE_RATE),
    '-c', '1',
    '-b', '16',
    '-e', 'signed-integer',
    '-t', 'wav', '-',
  ]);

  sox.stdout.pipe(currentStream);
  sox.stderr.on('data', d => {
    const s = d.toString();
    if (/error|fail/i.test(s)) process.stderr.write(`[sox] ${s}`);
  });
  sox.on('exit', code => {
    if (code !== 0 && code !== null) console.error(`[sox] exited ${code}`);
  });

  recording = sox;
}

function rotate() {
  const finished = currentPath;
  const finishedStream = currentStream;
  const finishedRec = recording;

  // start new chunk immediately (parallel) so we don't lose audio between rotations
  startChunk();

  // close previous chunk in background
  if (finishedRec) finishedRec.kill('SIGTERM');
  if (finishedStream) finishedStream.end();

  setTimeout(() => {
    if (finished && onChunkCb) onChunkCb(finished);
  }, 80);
}

async function startCapture(onChunk) {
  onChunkCb = onChunk;
  startChunk();
  rotateTimer = setInterval(rotate, CHUNK_SECONDS * 1000);
}

async function stopCapture() {
  if (rotateTimer) clearInterval(rotateTimer);
  rotateTimer = null;
  if (recording) recording.kill('SIGTERM');
  recording = null;
  if (currentStream) currentStream.end();
  currentStream = null;
}

module.exports = { startCapture, stopCapture };
