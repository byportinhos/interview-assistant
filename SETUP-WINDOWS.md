# Interview Assistant — Setup Windows

## 1. Dependências

### Node.js 20+
- https://nodejs.org/en/download → Windows Installer LTS

### sox
- Baixa: https://sourceforge.net/projects/sox/files/sox/14.4.2/sox-14.4.2-win32.exe/download
- Instala no path padrão: `C:\Program Files (x86)\sox-14-4-2\`
- Ou muda `SOX_BIN` no `.env` pro caminho real

### whisper.cpp (binário Windows)
- Baixa release do GitHub: https://github.com/ggerganov/whisper.cpp/releases
  - Arquivo: `whisper-blas-bin-x64.zip` (ou `whisper-cublas-*` se tiver GPU NVIDIA)
- Extrai em `C:\whisper\`
- Confirma que `C:\whisper\whisper-cli.exe` (ou `main.exe`) existe
- Se nome for diferente, ajusta `WHISPER_BIN` no `.env`

### VB-CABLE (loopback audio)
- Baixa: https://vb-audio.com/Cable/ → VBCABLE_Driver_Pack43.zip
- Extrai, roda `VBCABLE_Setup_x64.exe` como Administrador
- Reinicia Windows
- Vai criar dois devices:
  - **CABLE Input** (output virtual)
  - **CABLE Output** (input virtual — é o que o app lê)

## 2. Configurar áudio Windows

### Ouvir + capturar simultâneo (equivalente ao Multi-Output do Mac)

Windows não tem Multi-Output nativo. Duas opções:

**Opção A (recomendada) — Aplicativo separado por rota:**
- Configurações → Sistema → Som → Volume mixer
- No app da reunião (Zoom/Meet/Teams): output = **CABLE Input**
- Windows default = seu fone
- Você configura DENTRO do Zoom/Meet/Teams pra saída ser CABLE Input
- O áudio do fone: fone separado por USB/Bluetooth continua funcionando

**Opção B — VoiceMeeter (mais controle):**
- https://vb-audio.com/Voicemeeter/ (grátis)
- Roteia áudio pra CABLE Input E fone ao mesmo tempo

### Config no Meet/Zoom/Teams:
- Zoom → Preferências → Áudio → Alto-falante → **CABLE Input (VB-Audio Virtual Cable)**
- Meet → Configurações → Áudio → Alto-falantes → **CABLE Input**
- Teams → Configurações → Dispositivos → Alto-falante → **CABLE Input**

### O que o app captura
- Device de INPUT: **CABLE Output (VB-Audio Virtual Cable)** (default do app no Windows)

## 3. Clone + install

```powershell
git clone https://github.com/SEU_USUARIO/interview-assistant.git
cd interview-assistant
npm install
```

## 4. Modelo Whisper

Baixa modelo multilingual (PT) — 141MB:

```powershell
mkdir models
curl -L -o models\ggml-base.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
```

## 5. .env

Cria `.env` na raiz:

```
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_MODEL=deepseek-chat
WHISPER_LANG=pt
WHISPER_BIN=C:\whisper\whisper-cli.exe
WHISPER_MODEL_PATH=C:\Users\SEU_USUARIO\interview-assistant\models\ggml-base.bin
SOX_BIN=C:\Program Files (x86)\sox-14-4-2\sox.exe
AUDIO_DEVICE=CABLE Output (VB-Audio Virtual Cable)
```

Ajusta paths conforme onde instalou. Se nome do CABLE tá diferente, roda esse comando pra listar devices:

```powershell
"C:\Program Files (x86)\sox-14-4-2\sox.exe" -t waveaudio --help 2>&1 | Select-String -Pattern "device"
```

## 6. Rodar

```powershell
npm start
```

Abre janela flutuante. Clica ⚙, confirma device correto, clica Start.

## 7. Empacotar em .exe (opcional)

```powershell
npx electron-builder --win --x64
```

Gera `dist\win-unpacked\Interview Assistant.exe` que roda sem npm.

## Troubleshooting

**"sox: unable to open input device":**
- VB-CABLE não instalou corretamente. Reinstala + reinicia.
- Nome do device diferente. Roda: `sox.exe -t waveaudio -d /dev/null` pra ver devices disponíveis.

**"whisper-cli not found":**
- Path errado em `WHISPER_BIN`. Confirma que arquivo existe.

**Barra de nível cinza (sem áudio):**
- Meet/Zoom/Teams não tá com output = CABLE Input.
- Testa: toca música no navegador com output configurado pra CABLE Input.

**Erro DeepSeek:**
- Chave no `.env` inválida ou sem créditos. Confere em https://platform.deepseek.com.
