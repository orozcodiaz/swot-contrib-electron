document.addEventListener('DOMContentLoaded', () => {
    const importSettingsBtn = document.getElementById('import-settings');
    const exportSettingsBtn = document.getElementById('export-settings');

    importSettingsBtn.addEventListener('click', async () => {
        const result = await api.showImportSettingsDialog();
        if (result.canceled) return;
        if (result.error) {
            alert('Import failed: ' + result.error);
            return;
        }
        const s = result.settings || {};
        document.getElementById('gitHubToken').value = s.gitHubToken ?? '';
        document.getElementById('baseRepository').value = s.baseRepository ?? '';
        document.getElementById('headOwner').value = s.headOwner ?? '';
        document.getElementById('timezone').value = s.timezone ?? '';
        document.getElementById('swot-folder-path').value = s.swotFolderPath ?? '';
        document.getElementById('schools-json-path').value = s.schoolsJsonPath ?? '';
    });

    exportSettingsBtn.addEventListener('click', async () => {
        const result = await api.showExportSettingsDialog();
        if (result.canceled) return;
        if (result.error) {
            alert('Export failed: ' + result.error);
            return;
        }
        alert('Settings exported to:\n' + result.path);
    });
});