const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    sendToMain: (channel, data) => {
        ipcRenderer.send(channel, data);  // Send data to the main process
    },
    receiveFromMain: (channel, callback) => {
        ipcRenderer.on(channel, (event, ...args) => callback(...args));
    },
    pullSettings: () => ipcRenderer.invoke('pull-settings'),
    checkSettings: () => ipcRenderer.invoke('check-settings'),
    getContributionsAmount: () => ipcRenderer.invoke('get-contributions-amount'),
    getTimezone: () => ipcRenderer.invoke('get-timezone'),
    setTimezone: (timezone) => ipcRenderer.invoke('set-timezone', timezone),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    checkGitHubToken: (token) => ipcRenderer.invoke('check-github-token', token)
});