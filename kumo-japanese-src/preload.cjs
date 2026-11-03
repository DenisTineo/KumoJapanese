const { contextBridge, ipcRenderer } = require('electron');

let beforeCloseCallback = null;
let closeSaveInProgress = false;

ipcRenderer.on('app:before-close', async () => {
  if (closeSaveInProgress) return;
  closeSaveInProgress = true;
  try {
    await beforeCloseCallback?.();
  } catch (error) {
    console.error('Unable to save progress before closing:', error?.message || error);
  } finally {
    ipcRenderer.send('app:close-ready');
  }
});

contextBridge.exposeInMainWorld('kumoDesktop', Object.freeze({
  loadProgress: () => ipcRenderer.invoke('progress:load'),
  saveProgress: (value) => ipcRenderer.invoke('progress:save', value),
  exportProgress: (value) => ipcRenderer.invoke('progress:export', value),
  importProgress: () => ipcRenderer.invoke('progress:import'),
  translateToJapanese: (text, sourceLanguage) => ipcRenderer.invoke('translation:to-japanese', { text, sourceLanguage }),
  openMicrophoneSettings: () => ipcRenderer.invoke('app:open-microphone-settings'),
  onBeforeClose: (callback) => {
    if (typeof callback === 'function') beforeCloseCallback = callback;
  },
  getVersion: () => ipcRenderer.invoke('app:version')
}));
