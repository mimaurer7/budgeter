import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  readData: (filePath: string) => ipcRenderer.invoke('read-data', filePath),
  writeData: (filePath: string, data: unknown) => ipcRenderer.invoke('write-data', filePath, data),
  openCsvDialog: () => ipcRenderer.invoke('open-csv-dialog'),
  getDataPath: () => ipcRenderer.invoke('get-data-path')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
