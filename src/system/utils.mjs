import { Menu, shell } from 'electron';

export function CallContextMenu(mainWindow, params)
{
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Cut',
            role: 'cut',
            enabled: params.editFlags.canCut,
        },
        {
            label: 'Copy',
            role: 'copy',
            enabled: params.editFlags.canCopy,
        },
        {
            label: 'Paste',
            role: 'paste',
            enabled: params.editFlags.canPaste,
        },
    ]);

    contextMenu.popup(mainWindow);
}

export function GetDockMenu()
{
    return Menu.buildFromTemplate([
        {
            label: 'New Window',
            click () { console.log('New Window') }
        }, {
            label: 'New Window with Settings',
            submenu: [
                { label: 'Basic' },
                { label: 'Pro' }
            ]
        },
        { label: 'New Command...' }
    ]);
}

export function CreateAppMenu(app)
{
    const template = [
        {
            label: app.name,
            submenu: [
                {
                    label: 'About',
                    role: 'about'
                },
                {
                    label: 'Create New Instance',
                    accelerator: 'Cmd+N',
                    click: () => {
                        console.log('TODO: Create a process to create a new window');// TODO: Fix this
                    }
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: 'Cmd+Q',
                    role: 'quit'
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' },
            ],
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Visit coldrocksoftware.com',
                    click: async () => {
                        await shell.openExternal('https://coldrocksoftware.com')
                    }
                }
            ]
        }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
}