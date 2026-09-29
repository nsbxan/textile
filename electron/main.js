const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'Savdo ERP - Savdo va Ombor Nazorati',
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Backup Export IPC
ipcMain.handle('save-backup-dialog', async (event, dataString) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Zaxira nusxani saqlash',
    defaultPath: `Savdo_ERP_Backup_${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON Fayllar', extensions: ['json'] }]
  });

  if (filePath) {
    fs.writeFileSync(filePath, dataString, 'utf-8');
    return { success: true, filePath };
  }
  return { success: false };
});

// Restore Backup IPC
ipcMain.handle('open-backup-dialog', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Zaxira nusxani yuklash',
    properties: ['openFile'],
    filters: [{ name: 'JSON Fayllar', extensions: ['json'] }]
  });

  if (filePaths && filePaths.length > 0) {
    const data = fs.readFileSync(filePaths[0], 'utf-8');
    return { success: true, data };
  }
  return { success: false };
});
