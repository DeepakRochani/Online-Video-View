/**
 * Cinema Video Modal Player Controller
 */

function openVideoPlayer(videoId, title, eventName, streamUrl) {
    const modal = document.getElementById('videoModal');
    const player = document.getElementById('cinemaPlayer');
    const source = document.getElementById('videoSource');
    const titleElem = document.getElementById('modalVideoTitle');
    const eventElem = document.getElementById('modalEventName');
    const bufferingOverlay = document.getElementById('playerBuffering');

    if (!modal || !player || !source) return;

    titleElem.textContent = title || 'Wedding Film';
    eventElem.textContent = eventName || 'Main Event';

    // Show buffering state initially
    if (bufferingOverlay) bufferingOverlay.style.display = 'flex';

    // Set source stream URL
    source.src = streamUrl;
    player.load();

    player.oncanplay = function () {
        if (bufferingOverlay) bufferingOverlay.style.display = 'none';
        player.play().catch(e => {
            console.log("Autoplay was prevented, awaiting user interaction:", e);
        });
    };

    player.onwaiting = function () {
        if (bufferingOverlay) bufferingOverlay.style.display = 'flex';
    };

    player.onplaying = function () {
        if (bufferingOverlay) bufferingOverlay.style.display = 'none';
    };

    player.onerror = function (e) {
        if (bufferingOverlay) {
            bufferingOverlay.innerHTML = `
                <div style="color:#EF4444; font-size:1.5rem;">✕</div>
                <p style="color:#EF4444;">Unable to load video stream from Google Drive.</p>
                <button class="btn btn-sm btn-outline" onclick="openVideoPlayer(${videoId}, '${title}', '${eventName}', '${streamUrl}')">Retry Stream</button>
            `;
            bufferingOverlay.style.display = 'flex';
        }
    };

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeVideoPlayer() {
    const modal = document.getElementById('videoModal');
    const player = document.getElementById('cinemaPlayer');
    const source = document.getElementById('videoSource');

    if (player) {
        player.pause();
        if (source) source.src = '';
        player.load();
    }

    if (modal) {
        modal.style.display = 'none';
    }

    document.body.style.overflow = '';
}

// Close on backdrop click
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('videoModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeVideoPlayer();
            }
        });
    }

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeVideoPlayer();
        }
    });
});
