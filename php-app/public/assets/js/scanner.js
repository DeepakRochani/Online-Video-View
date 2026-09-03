/**
 * Google Drive AJAX Scanner Handler
 */

document.addEventListener('DOMContentLoaded', () => {
    const scanForm = document.getElementById('scanForm');
    const scanBtn = document.getElementById('scanBtn');
    const scanBtnText = document.getElementById('scanBtnText');
    const scanStatus = document.getElementById('scanStatus');

    if (scanForm && scanBtn) {
        scanForm.addEventListener('submit', function (e) {
            // Check if AJAX scanning is supported on this page
            const action = scanForm.getAttribute('action');
            if (action && action.includes('/scan')) {
                scanBtn.disabled = true;
                if (scanBtnText) scanBtnText.textContent = '⏳ Scanning Google Drive Folder...';
                if (scanStatus) {
                    scanStatus.style.display = 'block';
                    scanStatus.textContent = 'Connecting to Google Drive and searching for wedding films...';
                }
            }
        });
    }
});
