document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('about-button').addEventListener('click', openAboutModal);
    document.getElementById('close-about-modal').addEventListener('click', hideAboutModal);

    function openAboutModal() {
        document.getElementById('modal-overlay').style.display = 'block';
        document.getElementById('about-container').style.display = 'block';
    }

    function hideAboutModal() {
        document.getElementById('modal-overlay').style.display = 'none';
        document.getElementById('about-container').style.display = 'none';
    }
});