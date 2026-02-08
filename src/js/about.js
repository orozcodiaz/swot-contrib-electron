document.addEventListener('DOMContentLoaded', () => {
    const aboutContainer = document.getElementById('about-container');
    const githubLink = document.getElementById('about-github-link');

    document.getElementById('about-button').addEventListener('click', openAboutModal);
    document.getElementById('close-about-modal').addEventListener('click', hideAboutModal);

    githubLink.addEventListener('click', (e) => {
        e.preventDefault();
        api.openExternal(githubLink.dataset.url);
    });

    function openAboutModal() {
        document.getElementById('modal-overlay').style.display = 'block';
        aboutContainer.style.display = 'block';
    }

    function hideAboutModal() {
        document.getElementById('modal-overlay').style.display = 'none';
        aboutContainer.style.display = 'none';
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && aboutContainer.style.display === 'block') {
            hideAboutModal();
        }
    });
});