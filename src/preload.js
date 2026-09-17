const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  toggleCapture: () => ipcRenderer.invoke('toggle-capture'),
  quit: () => ipcRenderer.invoke('quit'),
  listDevices: () => ipcRenderer.invoke('list-devices'),
  saveDevice: (name) => ipcRenderer.invoke('save-device', name),
  clearContext: () => ipcRenderer.invoke('clear-context'),
  uploadProfile: () => ipcRenderer.invoke('upload-profile'),
  getProfileInfo: () => ipcRenderer.invoke('get-profile-info'),
  clearProfile: () => ipcRenderer.invoke('clear-profile'),
  onTranscript: (cb) => ipcRenderer.on('transcript', (_, t) => cb(t)),
  onSuggestion: (cb) => ipcRenderer.on('suggestion', (_, s) => cb(s)),
  onError: (cb) => ipcRenderer.on('error', (_, e) => cb(e)),
  onLevel: (cb) => ipcRenderer.on('level', (_, l) => cb(l)),
  onHotkeyToggle: (cb) => ipcRenderer.on('hotkey-toggle', () => cb()),
});
