# Interview Assistant

Floating overlay for English-language job interviews. Captures interviewer audio, transcribes with local Whisper, and uses DeepSeek to produce a Portuguese translation + suggested English answer.

## Requirements (macOS)

1. **Homebrew deps:**
   ```bash
   brew install sox
   brew install blackhole-2ch
   ```

2. **Route interviewer audio to BlackHole:**
   - Open *Audio MIDI Setup* → create a **Multi-Output Device**: check `BlackHole 2ch` + your speakers/headphones.
   - macOS Sound → Output → select the Multi-Output Device.
   - Now Zoom/Meet/browser audio goes to both your ears AND BlackHole (which this app reads).

3. **Node 20+**

## Setup

```bash
cd interview-assistant
npm install
cp .env.example .env
# edit .env, paste DEEPSEEK_API_KEY
npm start
```

First run downloads the Whisper `base.en` model (~150MB) automatically.

## Hotkeys

- `⌘⇧H` — hide/show window
- `⌘⇧Space` — start/stop capture

## Anti-screen-share

`setContentProtection(true)` is enabled — the window is invisible in Zoom/Meet screen shares on macOS.

## Tuning

- Chunk size: `CHUNK_SECONDS` in `src/audio/capture.js` (default 5s).
- Whisper model: `WHISPER_MODEL` env (`tiny.en`, `base.en`, `small.en`, `medium.en`). Bigger = slower + more accurate.
- Audio device: `AUDIO_DEVICE` env (default `BlackHole 2ch`).
