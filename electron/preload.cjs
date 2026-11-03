const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("booklean", {
  load: () => ipcRenderer.invoke("library:load"),
  save: (library) => ipcRenderer.invoke("library:save", library),
  importFile: () => ipcRenderer.invoke("file:import"),
  exportBook: (book, format, chapterId) =>
    ipcRenderer.invoke("file:export", book, format, chapterId),
  pickImage: () => ipcRenderer.invoke("image:pick"),
  openDataFolder: () => ipcRenderer.invoke("data:open"),
  chooseDataFolder: () => ipcRenderer.invoke("data:choose"),
  setPresence: (context) => ipcRenderer.invoke("discord:set-context", context),
  getDiscordStatus: () => ipcRenderer.invoke("discord:get-status"),
  onDiscordStatus: (callback) => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on("discord:status", handler);
    return () => ipcRenderer.removeListener("discord:status", handler);
  },
  listBackups: () => ipcRenderer.invoke("backup:list"),
  createBackup: (library) => ipcRenderer.invoke("backup:create", library),
  readBackup: (name) => ipcRenderer.invoke("backup:read", name),
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
  onClosing: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("window:closing", handler);
    return () => ipcRenderer.removeListener("window:closing", handler);
  },
  confirmClose: () => ipcRenderer.send("window:confirm-close"),
});
