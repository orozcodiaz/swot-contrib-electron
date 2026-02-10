document.addEventListener('DOMContentLoaded', async () => {
    const swotPath = document.getElementById('swot-path');
    const startProcAgainBtn = document.getElementById('select-swot-folder');
    const selectJsonFileBtn = document.getElementById('select-json-file');
    const schoolsPath = document.getElementById('schools-path');
    const refreshBtn = document.getElementById('refresh-random');
    const exitBtn = document.getElementById('exit-button');
    const totalUnmentionedSchools = document.getElementById('total-unmentioned');
    const swotContainer = document.getElementById('swot-container');
    const overlay = document.getElementById('modal-overlay');
    const logContainer = document.getElementById('log-container');

    const settingsBtn = document.getElementById('settings-button');
    const closeSettingsModalBtn = document.querySelectorAll('.close-settings-modal');
    const settingsContainer = document.getElementById('settings-container');
    const saveSettingBtn = document.getElementById('save-settings');
    const gitHubToken = document.getElementById('gitHubToken');
    const baseRepository = document.getElementById('baseRepository');
    const headOwner = document.getElementById('headOwner');
    const timezone = document.getElementById('timezone');
    const swotFolderPath = document.getElementById('swot-folder-path');
    const schoolsJsonPath = document.getElementById('schools-json-path');

    const prSchoolName = document.getElementById('prSchoolName');
    const prSchoolDomain = document.getElementById('prSchoolDomain');
    const prSchoolPath = document.getElementById('prSchoolPath');
    const prTitleBox = document.getElementById('prTitle');
    const prBodyBox = document.getElementById('prBody');
    const prModal = document.getElementById('pull-request-data-container');
    const createPrButton = document.getElementById('create-pull-request-button');
    const closePrModal = document.querySelector('.close-modal');
    const cancelPrBtn = document.getElementById('cancel-pull-request');

    const totalContributions = document.getElementById('total-contributions');

    let currentTimeZone = null;

    showLoader();

    // Update contributions number (based on history)
    ReloadContribCounter();

    LogMessage('SWOT Contributor initialized');
    LogMessage('Checking settings...');
    api.checkSettings().then(result => {
        hideLoader();

        // That means it's first init, no settings yet
        if (result === null) {
            openSettingsModal();
            return;
        }

        if (result.success === false) {
            alert(result.message);
            openSettingsModal();
            return;
        }

        LogMessage(result.message);
        showLoader();
        api.sendToMain('select-swot-folder');
    });

    api.receiveFromMain('swot-folder-selected', (folderPath) => {
        if (folderPath) {
            swotPath.innerHTML = folderPath;
            selectJsonFileBtn.disabled = false;
            api.sendToMain('select-schools-json');
        }
    });

    api.receiveFromMain('swot-folder-selection-canceled', () => {
        LogMessage(`SWOT folder selection has been cancelled`);
        hideLoader();
    });

    api.receiveFromMain('json-selection-canceled', () => {
        LogMessage(`JSON selection has been cancelled`);
        hideLoader();
    });

    api.receiveFromMain('swot-folder-verification-failed', (message) => {
        alert(message);
        hideLoader();
        openSettingsModal();
    });

    api.receiveFromMain('schools-json-selected', (filePath) => {
        if (filePath) {
            LogMessage(`School JSON selected: ${filePath}`);
            schoolsPath.innerHTML = filePath;
            refreshBtn.disabled = false;
            api.sendToMain('get-random-schools');
        }
    });

    api.receiveFromMain('random-unmentioned-schools', (args) => {
        hideLoader();
        LogMessage(`Refresh. Loading 5 random schools`);
        totalUnmentionedSchools.innerHTML = args.amount;
        swotContainer.innerHTML = args.schoolsHtml;
    });

    selectJsonFileBtn.addEventListener('click', function () {
        api.sendToMain('select-schools-json');
    });

    exitBtn.addEventListener('click', function () {
        api.sendToMain('invoke-exit');
    });

    document.getElementById('minimize-btn').addEventListener('click', () => {
        api.sendToMain('minimize-window');
    });

    document.getElementById('close-btn').addEventListener('click', () => {
        api.sendToMain('invoke-exit');
    });

    function showLoader()
    {
        overlay.style.display = 'block';
        document.getElementById('spinner').style.display = 'flex';
    }

    function hideLoader()
    {
        overlay.style.display = 'none';
        document.getElementById('spinner').style.display = 'none';
    }

    // "Copy School Name" Button
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('copy-school-name-btn')) {
            const btn = event.target;
            const originalText = btn.textContent;

            const textToCopy = btn.getAttribute('data-copy') || 'Copied text';
            LogMessage(`Copied ${textToCopy}`);
            navigator.clipboard.writeText(textToCopy).then(() => {
                btn.textContent = 'Copied!';
                btn.style.left = "400px";
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.left = "420px";
                }, 1500);
            });
        }
    });

    refreshBtn.addEventListener('click', function () {
        api.sendToMain('get-random-schools');
    });

    // "Contribute School" Button
    document.addEventListener('click', function(event) {
        const button = event.target.closest('.contribute-btn');

        if (!button) {
            return;
        }

        button.style.display = "none";
        showLoader();

        const schoolName = button.getAttribute('data-name');
        const schoolDomain = button.getAttribute('data-domain');
        const schoolPath = button.getAttribute('data-filepath');

        // Set hidden fields
        prSchoolName.value = schoolName;
        prSchoolDomain.value = schoolDomain;
        prSchoolPath.value = schoolPath;

        LogMessage(`Preparing to contribute ${schoolName} (${schoolDomain})`);
        LogMessage(`Filepath: ${schoolPath}`);

        api.sendToMain('contribute-school', {
            schoolDomain: schoolDomain,
            schoolName: schoolName,
            schoolPath: schoolPath
        });
    });

    api.receiveFromMain('get-pull-request-data', (args) => {
        prTitleBox.value = args.prTitle;
        prBodyBox.value = args.prBody;
        hideLoader();
        showPrModal();
    });

    // Function to show PR modal
    function showPrModal() {
        prModal.style.display = 'block';
        overlay.style.display = 'block';
        document.body.classList.add('modal-open');

        // Create an absolutely positioned div that covers everything
        const blocker = document.createElement('div');
        blocker.id = 'modal-blocker';
        blocker.style.position = 'fixed';
        blocker.style.top = '0';
        blocker.style.left = '0';
        blocker.style.width = '100vw';
        blocker.style.height = '100vh';
        blocker.style.zIndex = '998';
        blocker.style.backgroundColor = 'transparent';
        document.body.appendChild(blocker);
    }

    // Function to hide modal
    function hidePrModal() {
        createPrButton.disabled = false;
        prModal.style.display = 'none';
        overlay.style.display = 'none';
        document.body.classList.remove('modal-open');

        // Remove the blocker
        const blocker = document.getElementById('modal-blocker');
        if (blocker) {
            document.body.removeChild(blocker);
        }
    }

    // Event listeners
    closePrModal.addEventListener('click', function () {
        if (confirm('Are you sure you want to cancel?')) {
            hidePrModal();
        }
    });

    cancelPrBtn.addEventListener('click', function () {
        if (confirm('Are you sure you want to cancel?')) {
            hidePrModal();
        }
    });

    // Create PR button in PR modal
    createPrButton.addEventListener('click', function () {
        LogMessage(`Creating Pull Request...`);
        hidePrModal();
        showLoader();
        api.sendToMain('create-pull-request', {
            prTitle: prTitleBox.value,
            prBody: prBodyBox.value,
            prSchoolName: prSchoolName.value,
            prSchoolDomain: prSchoolDomain.value,
            prSchoolPath: prSchoolPath.value
        });
    });

    api.receiveFromMain('pull-request-finished', (args) => {
        ReloadContribCounter();
        LogMessage(`PR created successfully!`);
        LogMessage(`PR link: ${args.url}`);
        hideLoader();
        alert(args.url);
    });

    api.receiveFromMain('add-to-log', (message) => {
        LogMessage(message);
    });

    startProcAgainBtn.addEventListener('click', function () {
        showLoader();
        api.sendToMain('select-swot-folder');
    });

    function ReloadContribCounter()
    {
        api.getContributionsAmount().then(contributionsAmount => {
            totalContributions.innerHTML = contributionsAmount;
        });
    }

    function LogMessage(message)
    {
        GetFormattedDate().then(formattedDate => {
            logContainer.value += `${formattedDate}: ${message}\n`;
            logContainer.scrollTop = logContainer.scrollHeight;
        })
    }

    async function GetCurrentTimezone()
    {
        if (currentTimeZone === null) {
            currentTimeZone = await api.getTimezone();
            if (currentTimeZone === null || currentTimeZone === '') {
                currentTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                await api.setTimezone(currentTimeZone);
            }
        }

        return currentTimeZone;
    }

    async function GetFormattedDate() {
        const dateObject = new Date();
        const dateTimeConfig = {
            timeZone: await GetCurrentTimezone(),
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        };

        return new Intl.DateTimeFormat("en-US", dateTimeConfig).format(dateObject);
    }

    settingsBtn.addEventListener('click', openSettingsModal);

    closeSettingsModalBtn.forEach(btn => {
        btn.addEventListener('click', () => {
            closeSettingsModal();
        });
    });

    function openSettingsModal() {
        PropagateSettings();
        overlay.style.display = 'block';
        settingsContainer.style.display = 'block';
    }

    function closeSettingsModal() {
        saveSettingBtn.disabled = false;
        settingsContainer.style.display = 'none';
        overlay.style.display = 'none';
    }

    // Pull and propagate settings value into form
    function PropagateSettings()
    {
        api.pullSettings().then(settings => {
            gitHubToken.value = settings.gitHubToken ?? '';
            baseRepository.value = settings.baseRepository ?? '';
            headOwner.value = settings.headOwner ?? '';
            timezone.value = settings.timezone ?? '';
            swotFolderPath.value = settings.swotFolderPath ?? '';
            schoolsJsonPath.value = settings.schoolsJsonPath ?? '';
        });
    }

    // Check token button
    const checkTokenBtn = document.getElementById('check-token-btn');
    const tokenResponseContainer = document.getElementById('token-response-container');
    const tokenResponseJson = document.getElementById('token-response-json');
    const closeTokenResponseBtn = document.querySelectorAll('.close-token-response-modal');

    function closeTokenResponseModal() {
        tokenResponseContainer.style.display = 'none';
    }

    closeTokenResponseBtn.forEach(btn => {
        btn.addEventListener('click', closeTokenResponseModal);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (tokenResponseContainer.style.display === 'block') {
            closeTokenResponseModal();
        } else if (settingsContainer.style.display === 'block') {
            closeSettingsModal();
        }
    });

    checkTokenBtn.addEventListener('click', async () => {
        const token = gitHubToken.value?.trim();
        if (!token) {
            alert('Enter a GitHub token first');
            return;
        }
        checkTokenBtn.classList.add('loading');
        checkTokenBtn.disabled = true;
        await new Promise(r => requestAnimationFrame(r));
        try {
            const { status, body } = await api.checkGitHubToken(token);
            let displayText = body;
            try {
                const parsed = JSON.parse(body);
                displayText = JSON.stringify(parsed, null, 2);
            } catch (_) {}
            tokenResponseJson.textContent = `Status: ${status}\n\n${displayText}`;
            tokenResponseContainer.style.display = 'block';
        } finally {
            checkTokenBtn.classList.remove('loading');
            checkTokenBtn.disabled = false;
        }
    });

    // Save Settings button
    saveSettingBtn.addEventListener('click', () => {
        saveSettingBtn.disabled = true;
        showLoader();

        api.saveSettings({
            gitHubToken: gitHubToken.value,
            baseRepository: baseRepository.value,
            headOwner: headOwner.value,
            timezone: timezone.value,
            swotFolderPath: swotFolderPath.value,
            schoolsJsonPath: schoolsJsonPath.value
        }).then(result => {
            hideLoader();

            if (result.success === false) {
                alert(result.message);
                return;
            }

            closeSettingsModal();
        });
    });
});
