"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mdv", {
  save: (settings) => ipcRenderer.send("save-settings", settings),
  close: () => ipcRenderer.send("close-window"),
  openOsd: () => ipcRenderer.send("open-osd"),
});
