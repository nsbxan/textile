const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveBackup: (dataString) => ipcRenderer.invoke('save-backup-dialog', dataString),
  openBackup: () => ipcRenderer.invoke('open-backup-dialog'),
  isElectron: true,
});
