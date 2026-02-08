import {dialog, ipcMain, shell} from 'electron';
import parse from 'parse-git-config';
import {initializeApplication, InitializeIpcHandlers, InvokeExit, MinimizeWindow} from './src/system/app.mjs';
import {getUnmentionedSchoolTemplate} from './src/system/template-engine.mjs';
import {ExecCommand} from './src/system/git-helper.mjs';
import {createRequire} from 'module';
const require = createRequire(import.meta.url);
// TODO: fs and path could be pulled from app.mjs or utils.mjs
const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');
import AppStorage from 'electron-store';

const SwotContributorStorage = new AppStorage({ name: 'swot-contributor-storage' });
// Path: /Users/fred/Library/Application Support/swot-contrib-electron/swot-contributor-storage.json
// console.log(SwotContributorStorage.path);

// TODO: Move functions out of here, leave only IPC renderers

// Initialize application and core functionality
initializeApplication();
InitializeIpcHandlers();

let swotFolderPath = null;
let jsonSchoolsFile = null;

let newBranchForSchool = null;

const uniqueSchools = new Map();

async function VerifyGitHubToken(token)
{
    const octokit = new Octokit({ auth: token });
    try {
        // This is a safe GET request to check authentication
        const response = await octokit.request('GET /user');
        // If we get here, the token is valid
        return { valid: true, login: response.data.login };
    } catch (error) {
        // Token is invalid or lacks permissions
        return { valid: false, error: error.message };
    }
}

// Save settings
// TODO: Add validation for other fields
ipcMain.handle('save-settings',  async (event, settings) => {
    const tokenValidity = await VerifyGitHubToken(settings.gitHubToken);

    if (tokenValidity.valid === false) {
        return {
            success: false,
            message: "Error: token invalid"
        };
    }

    if (tokenValidity.login !== settings.headOwner) {
        return {
            success: false,
            message: `Error: head owner must be "${tokenValidity.login}"`
        };
    }

    SwotContributorStorage.set('settings', {
        gitHubToken: settings.gitHubToken,
        baseRepository: settings.baseRepository,
        headOwner: settings.headOwner,
        timezone: settings.timezone
    });

    event.sender.send('add-to-log', 'New settings have been saved!');

    return {
        success: true,
        message: "All good."
    };
});

// Check settings
// TODO: Remove code duplication
ipcMain.handle('check-settings',  async (event) => {
    const settings = SwotContributorStorage.get('settings');

    // Probably it's first start
    if (settings === null || settings === undefined) {
        return null;
    }

    // Probably first start - token isn't set
    if (settings.gitHubToken == null || settings.gitHubToken === '') {
        return {
            success: false,
            message: "Provide your GitHub token in the settings."
        };
    }

    const tokenValidity = await VerifyGitHubToken(settings.gitHubToken);

    if (tokenValidity.valid === false) {
        return {
            success: false,
            message: "Error: token invalid"
        };
    }

    if (tokenValidity.login !== settings.headOwner) {
        return {
            success: false,
            message: `Error: head owner must be "${tokenValidity.login}"`
        };
    }

    return {
        success: true,
        message: "All settings have been checked."
    };
});

ipcMain.handle('pull-settings',  (event) => {
    return SwotContributorStorage.get('settings');
});

ipcMain.handle('check-github-token', async (event, token) => {
    const response = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `token ${token}` }
    });
    const body = await response.text();
    return { status: response.status, body };
});

ipcMain.handle('get-timezone',  () => {
    return SwotContributorStorage.get('settings.timezone') ?? null;
});

ipcMain.handle('set-timezone',  (event, timezone) => {
    SwotContributorStorage.set('settings.timezone', timezone);
});

ipcMain.handle('get-contributions-amount',  () => {
    return SwotContributorStorage.get('history').length ?? 0;
});

ipcMain.handle('open-external', async (event, url) => {
    await shell.openExternal(url);
});

// Exit Button
ipcMain.on('invoke-exit', async (event) => {
    InvokeExit();
});

// Minimize Button
ipcMain.on('minimize-window', async (event) => {
    MinimizeWindow();
});

ipcMain.on('select-swot-folder', async (event) => {
    const result = await dialog.showOpenDialog({
        title: 'Select JetBrains SWOT folder',
        properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
        swotFolderPath = result.filePaths[0];

        // Verify if this is correct SWOT folder
        event.sender.send('add-to-log', `Checking folder ${swotFolderPath}`);
        const gitConfigFile = parse.sync({ path: `${swotFolderPath}/.git/config` });

        if (Object.keys(gitConfigFile).length === 0) {
            const errorMessage = `Error. There is not .git folder in ${swotFolderPath}`;
            event.sender.send('add-to-log', 'SWOT folder verification failed.');
            event.sender.send('add-to-log', errorMessage);
            return event.sender.send(
                'swot-folder-verification-failed',
                errorMessage
            );
        }

        const remoteOrigin = gitConfigFile['remote "origin"'];
        const gitUrl = remoteOrigin && remoteOrigin.url;
        const path = gitUrl.split(':')[1].replace('.git', '');
        const [user, repo] = path.split('/');
        const [baseUser, baseRepo] = SwotContributorStorage.get('settings.baseRepository').split('/');
        const headOwner = SwotContributorStorage.get('settings.headOwner') ?? null;

        if (headOwner !== user) {
            const errorMessage = `Error. Head owner is "${headOwner}" (settings), but SWOT folder user is "${user}".`;
            event.sender.send('add-to-log', 'SWOT folder verification failed.');
            event.sender.send('add-to-log', errorMessage);
            return event.sender.send(
                'swot-folder-verification-failed',
                errorMessage
            );
        }

        if (repo !== baseRepo) {
            const errorMessage = `Error. Base repo is "${baseRepo}" (settings), but repository in SWOT folder is "${repo}".`;
            event.sender.send('add-to-log', 'SWOT folder verification failed.');
            event.sender.send('add-to-log', errorMessage);
            return event.sender.send(
                'swot-folder-verification-failed',
                errorMessage
            );
        }

        event.sender.send('add-to-log', `Verification passed.`);
        event.sender.send('add-to-log', 'Pulling data from SWOT GIT...');
        await ExecCommand(swotFolderPath, 'git fetch origin');
        await ExecCommand(swotFolderPath, 'git fetch upstream');
        let gitLogCompare = await ExecCommand(swotFolderPath, 'git log master..upstream/master --oneline');

        // There are discrepancies - time to sync fork
        if (gitLogCompare != null && gitLogCompare.length > 10) {
            event.sender.send('add-to-log', 'Local repository is outdated. Merging new changes...');
            await ExecCommand(swotFolderPath, 'git merge upstream/master');
            await ExecCommand(swotFolderPath, 'git push origin master');
            event.sender.send('add-to-log', 'Merge finished!');
        } else {
            event.sender.send('add-to-log', 'Local repository is up to date');
        }

        event.sender.send('swot-folder-selected', swotFolderPath);
    } else {
        event.sender.send('swot-folder-selection-canceled');
    }
});

ipcMain.on('contribute-school', async (event, data) => {
    // TODO: Fill with event.sender.send('add-to-log', 'LOG MESSAGE (command output)');
    await ExecCommand(swotFolderPath, 'git checkout master');
    newBranchForSchool = `add-${data.schoolDomain}`;
    await ExecCommand(swotFolderPath, `git checkout -b ${newBranchForSchool}`);

    let folderPath = path.dirname(data.schoolPath);

    await ExecCommand(swotFolderPath, `mkdir -p ${folderPath}`);
    await ExecCommand(swotFolderPath, `echo "${data.schoolName}" > ${data.schoolPath}`);

    event.sender.send('add-to-log', 'Pushing new changes...');
    const relativePath = path.relative(swotFolderPath, data.schoolPath);// lib/domains/...
    await ExecCommand(swotFolderPath, `git add ${relativePath}`);
    await ExecCommand(swotFolderPath, `git commit -m "Add ${data.schoolName}"`);
    await ExecCommand(swotFolderPath, `git push --set-upstream origin ${newBranchForSchool}`);

    // Request a window with data for pull request
    event.sender.send('get-pull-request-data', {
        prTitle: `Add ${data.schoolName}`,
        prBody: `${data.schoolName}\n\nTech faculty link: [](url)`
    });
});

ipcMain.on('select-schools-json', async (event) => {
    const result = await dialog.showOpenDialog({
        title: 'Select Schools JSON',
        properties: ['openFile'],
        filters: [
            { name: 'JSON Files', extensions: ['json', 'JSON'] }// TODO: This actually doesn't work on MacOS
        ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        jsonSchoolsFile = result.filePaths[0];
        event.sender.send('schools-json-selected', jsonSchoolsFile);

        PropagateUnmentionedSchools();
    } else {
        event.sender.send('json-selection-canceled');
    }
});

ipcMain.on('get-random-schools', (event) => {
    let htmlOutput = '';
    let randomSchools = GetRandomSchools(Array.from(uniqueSchools.values()));

    randomSchools.forEach(school => {
        htmlOutput = htmlOutput + getUnmentionedSchoolTemplate(school.name, school.domain, school.filepath);
    });

    event.sender.send('random-unmentioned-schools', {
        amount: uniqueSchools.size,
        schoolsHtml: htmlOutput
    });
});

ipcMain.on('create-pull-request', async (event, args) => {
    const octokit = new Octokit({
        auth: SwotContributorStorage.get('settings.gitHubToken')
    });

    try {
        const baseRepositorySetting = SwotContributorStorage.get('settings.baseRepository');
        const [baseOwner, baseRepo] = baseRepositorySetting.split('/');
        const headOwner = SwotContributorStorage.get('settings.headOwner');

        const response = await octokit.request(`POST /repos/${baseRepositorySetting}/pulls`, {
            owner: baseOwner,
            repo: baseRepo,
            title: args.prTitle,
            body: args.prBody,
            head: `${headOwner}:${newBranchForSchool}`,
            base: 'master',
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })

        event.sender.send('add-to-log', `PR creation status: ${response.status}`);

        event.sender.send('pull-request-finished', {
            url: response.data.html_url
        });

        // Save to history
        const history = SwotContributorStorage.get('history') || [];
        history.push({
            contributed_at: new Date().toISOString(),
            prSchoolName: args.prSchoolName,
            prSchoolDomain: args.prSchoolDomain,
            prSchoolPath: args.prSchoolPath
        });
        SwotContributorStorage.set('history', history);
    } catch (error) {
        event.sender.send('add-to-log', `Error creating pull request: ${error.message}`);
        console.error('Error creating pull request:', error.message);

        // More detailed error information
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
});

function PropagateUnmentionedSchools()
{
    const schools = JSON.parse(fs.readFileSync(jsonSchoolsFile, 'utf8'));
    const libDomains = path.join('lib', 'domains');
    const domainsInit = path.join(swotFolderPath, libDomains);
    const abusedList = fs.readFileSync(path.join(domainsInit, 'abused.txt'), 'utf8');
    const stopList = fs.readFileSync(path.join(domainsInit, 'stoplist.txt'), 'utf8');

    schools.forEach(school => {
        // Skip elementary schools
        if (school.name.toLowerCase().includes('elementary')) {
            return;
        }

        school.domains.forEach(domain => {
            const website = domain.toLowerCase().replace(/www\.|student\./g, '');

            // Create the expected file path
            const parts = website.split('.');
            const tld = parts.pop();
            const reversedParts = parts.reverse();

            const filepath = path.join(domainsInit, tld, ...reversedParts) + '.txt';// full path to txt

            // Skip if in abused list
            if (abusedList.includes(website)) {
                return;
            }

            // Skip if in stop list
            if (stopList.includes(website)) {
                return;
            }

            // Check if the file exists
            if (!fs.existsSync(filepath)) {
                const schoolName = capitalizeWords(school.name.toLowerCase());

                // Only add to uniqueSchools if this domain hasn't been added before
                if (!uniqueSchools.has(website)) {
                    uniqueSchools.set(website, {
                        name: schoolName,
                        domain: website,
                        filepath: filepath
                    });
                }
            }
        });
    });
}

/**
 * Get a specified number of random schools from the collection
 * @param {Array} schoolsArray - Array of school objects
 * @param {Number} count - Number of random schools to return (default: 5)
 * @returns {Array} Array of randomly selected schools
 */
function GetRandomSchools(schoolsArray, count = 5)
{
    // Make sure we don't try to get more schools than exist
    count = Math.min(count, schoolsArray.length);

    // Create a copy to avoid modifying the original array
    const schoolsCopy = [...schoolsArray];
    const result = [];

    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * schoolsCopy.length);
        result.push(schoolsCopy[randomIndex]);
        schoolsCopy.splice(randomIndex, 1);
    }

    return result;
}

function capitalizeWords(str)
{
    return str.replace(/\b\w/g, char => char.toUpperCase());
}