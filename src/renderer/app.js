const $ = (id) => document.getElementById(id);
const transcriptEl = $('transcript');
const perguntaEl = $('pergunta');
const respostaEl = $('resposta');
const errEl = $('err');
const dot = $('statusDot');
const btn = $('toggleBtn');

let on = false;

async function toggle() {
  const { capturing } = await window.api.toggleCapture();
  on = capturing;
  dot.classList.toggle('on', on);
  btn.classList.toggle('on', on);
  btn.textContent = on ? 'Stop' : 'Start';
}

btn.addEventListener('click', toggle);
document.getElementById('closeBtn').addEventListener('click', () => window.api.quit());
window.api.onHotkeyToggle(toggle);

window.api.onTranscript((t) => {
  transcriptEl.textContent = t;
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
});

window.api.onSuggestion(({ pergunta, resposta }) => {
  perguntaEl.textContent = pergunta || '';
  respostaEl.textContent = resposta || '';
  respostaEl.scrollTop = 0;
});

window.api.onError((e) => {
  errEl.textContent = e;
  setTimeout(() => (errEl.textContent = ''), 5000);
});

// level meter
const levelBar = $('levelBar');
const rmsLabel = $('rmsLabel');
window.api.onLevel((rms) => {
  const pct = Math.min(100, (rms / 2000) * 100);
  levelBar.style.width = pct + '%';
  levelBar.style.background = rms < 30 ? '#dc2626' : rms < 200 ? '#f59e0b' : '#34d399';
  rmsLabel.textContent = `Nível: ${rms.toFixed(0)} ${rms < 30 ? '(silêncio — verifique Multi-Output)' : ''}`;
});

// settings modal
const settingsPanel = $('settingsPanel');
const deviceSelect = $('deviceSelect');
$('settingsBtn').addEventListener('click', async () => {
  settingsPanel.classList.remove('hidden');
  const { devices, current } = await window.api.listDevices();
  deviceSelect.innerHTML = '';
  const opts = devices.length ? devices : ['BlackHole 2ch', 'default'];
  for (const d of opts) {
    const o = document.createElement('option');
    o.value = d; o.textContent = d;
    if (d === current) o.selected = true;
    deviceSelect.appendChild(o);
  }
});
deviceSelect.addEventListener('change', async () => {
  await window.api.saveDevice(deviceSelect.value);
});
$('closeSettings').addEventListener('click', () => {
  settingsPanel.classList.add('hidden');
});

// clear context
$('clearBtn').addEventListener('click', async () => {
  await window.api.clearContext();
  transcriptEl.textContent = '';
  perguntaEl.textContent = '';
  respostaEl.textContent = '';
});

// profile upload
const profileInfo = $('profileInfo');
async function refreshProfile() {
  const { name, chars } = await window.api.getProfileInfo();
  profileInfo.textContent = name ? `${name} (${chars} chars)` : 'Nenhum arquivo carregado';
}
$('uploadBtn').addEventListener('click', async () => {
  const r = await window.api.uploadProfile();
  if (r.error) alert('Erro: ' + r.error);
  refreshProfile();
});
$('clearProfileBtn').addEventListener('click', async () => {
  await window.api.clearProfile();
  refreshProfile();
});
refreshProfile();
