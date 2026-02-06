import {app, BrowserWindow, dialog, globalShortcut} from 'electron';
import {
    CallContextMenu,
    CreateAppMenu,
    GetDockMenu
} from './utils.mjs';

import {createRequire} from 'module';
import {fileURLToPath} from 'url';
import {dirname} from 'path';

const require = createRequire(import.meta.url);
const path = require('path');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow = null;
let isExiting = false; // Prevent multiple exit triggers

export function initializeApplication()
{
    function createWindow() {
        mainWindow = new BrowserWindow({
            width: 1200,
            height: 750,
            frame: false,
            resizable: false,
            webPreferences: {
                preload: path.join(__dirname, '../preload.js'),
                contextIsolation: true,
                enableRemoteModule: false,
            },
        });

        //mainWindow.webContents.openDevTools();

        mainWindow.loadFile('src/views/index.html').then(() => {
            // Handle context menu
            mainWindow.webContents.on('context-menu', (event, params) => {
                CallContextMenu(mainWindow, params);
            });

            // Handle keyboard shortcuts
            mainWindow.webContents.on('before-input-event', (event, input) => {
                // Catch "quit" shortcut
                if (isQuitShortcut(input)) {
                    event.preventDefault();
                    handleAppExit();
                }
            });
        });

        // Handle red button click (close)
        mainWindow.on('close', (event) => {
            if (isExiting === false) {
                event.preventDefault();
                handleAppExit();
            }
        });
    }

    // Check if input corresponds to QUIT shortcut
    function isQuitShortcut(input) {
        return (
            (input.key === 'q' && input.meta && process.platform === 'darwin') || // Cmd+Q (macOS)
            (input.key === 'F4' && input.alt) || // Alt+F4 (Windows/Linux)
            (input.key === 'w' && input.control) // Ctrl+W (all platforms)
        );
    }

    // Show the confirmation dialog
    function showExitConfirmation() {
        if (isExiting || !mainWindow) return false;

        const response = dialog.showMessageBoxSync(mainWindow, {
            type: 'question',
            buttons: ['Yes', 'No'],
            defaultId: 1,
            cancelId: 1,
            title: 'Confirm Exit',
            message: 'Are you sure you want to exit?',
        });

        return response === 0; // Return true if "Yes" is clicked
    }

    // Unified app exit logic
    function handleAppExit() {
        if (isExiting) return;

        if (showExitConfirmation()) {
            isExiting = true;
            app.exit();
        }
    }

    // Application lifecycle events
    app.whenReady().then(() => {
        if (process.platform === 'darwin') {
            CreateAppMenu(app);
            app.dock.setMenu(GetDockMenu());
            app.dock.setIcon(__dirname + '/../images/icon.png');
            app.setAboutPanelOptions({
                applicationName: 'SWOT Contributor',
                applicationVersion: '1.0.0',
                version: '20250429',
                copyright: 'Cold Rock Software © 2025',
                website: 'https://coldrocksoftware.com',
                iconPath: __dirname + '/../images/icon.png'
            });
        }
    }).then(createWindow);

    app.on('window-all-closed', () => {
        handleAppExit();
    });

    app.on('before-quit', (event) => {
        if (!isExiting && !showExitConfirmation()) {
            event.preventDefault();
        } else {
            isExiting = true; // Prevent further exit triggers
        }
    });

    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            isExiting = false;
            createWindow();
        }
    });
}

export function MinimizeWindow()
{
    mainWindow.minimize();
}

export function InvokeExit()
{
    app.quit();
}

export function InitializeIpcHandlers()
{

}