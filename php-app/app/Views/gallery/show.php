<div class="client-gallery-page">
    <!-- Hero Banner -->
    <header class="gallery-hero" style="background-image: linear-gradient(180deg, rgba(8,8,10,0.6) 0%, rgba(8,8,10,0.95) 100%), url('<?= htmlspecialchars($wedding['banner_image_url'] ?? 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2000&auto=format&fit=crop') ?>');">
        <div class="gallery-hero-inner">
            <div class="studio-badge">
                <?= htmlspecialchars($settings['studio_name'] ?? 'DR FILMS CINEMA') ?>
            </div>
            <p class="hero-pretitle">THE WEDDING CELEBRATION OF</p>
            <h1 class="hero-couple-title"><?= htmlspecialchars($wedding['couple_name']) ?></h1>
            <?php if ($wedding['wedding_date']): ?>
                <div class="hero-date-divider">
                    <span class="divider-line"></span>
                    <span class="hero-date"><?= date('F d, Y', strtotime($wedding['wedding_date'])) ?></span>
                    <span class="divider-line"></span>
                </div>
            <?php endif; ?>
            <p class="hero-tagline">Relive every heartfelt vow, emotion, and magical celebration in high definition.</p>
        </div>
    </header>

    <!-- Gallery Navigation & Content -->
    <div class="gallery-container">
        <!-- Event Filter Tabs -->
        <?php if (count($events) > 1): ?>
            <div class="gallery-tabs">
                <button class="gallery-tab-btn active" onclick="filterEvent('all', this)">All Films (<?= count($videos) ?>)</button>
                <?php foreach ($events as $idx => $ev): ?>
                    <button class="gallery-tab-btn" onclick="filterEvent('event-<?= (int)$ev['id'] ?>', this)">
                        <?= htmlspecialchars($ev['name']) ?> (<?= count($ev['videos']) ?>)
                    </button>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>

        <!-- Event Sections -->
        <div class="gallery-events-wrap">
            <?php foreach ($events as $ev): ?>
                <div class="client-event-section" id="event-<?= (int)$ev['id'] ?>">
                    <div class="client-event-header">
                        <h2 class="client-event-title"><?= htmlspecialchars($ev['name']) ?></h2>
                        <span class="client-event-badge"><?= count($ev['videos']) ?> <?= count($ev['videos']) === 1 ? 'Film' : 'Films' ?></span>
                    </div>

                    <div class="client-videos-grid">
                        <?php foreach ($ev['videos'] as $v): ?>
                            <div class="client-video-card" onclick="openVideoPlayer(<?= (int)$v['id'] ?>, '<?= htmlspecialchars(addslashes($v['title'])) ?>', '<?= htmlspecialchars(addslashes($ev['name'])) ?>', '/api/videos/<?= (int)$v['id'] ?>/stream')">
                                <div class="client-thumb-wrap">
                                    <img src="<?= htmlspecialchars($v['thumbnail_url'] ?? "https://drive.google.com/thumbnail?id={$v['drive_file_id']}&sz=w1280") ?>" alt="<?= htmlspecialchars($v['title']) ?>" class="client-video-img" loading="lazy" onerror="this.src='/assets/images/video-placeholder.jpg'">
                                    <div class="client-play-overlay">
                                        <div class="client-play-btn">▶</div>
                                    </div>
                                    <?php if ($v['duration_seconds']): ?>
                                        <div class="client-duration"><?= sprintf('%02d:%02d', floor($v['duration_seconds'] / 60), $v['duration_seconds'] % 60) ?></div>
                                    <?php endif; ?>
                                </div>
                                <div class="client-video-meta">
                                    <h3 class="client-video-title"><?= htmlspecialchars($v['title']) ?></h3>
                                    <div class="client-video-subtext">
                                        <span><?= htmlspecialchars($ev['name']) ?></span>
                                        <?php if ($v['width'] && $v['height']): ?>
                                            <span>• <?= $v['height'] >= 1080 ? 'Full HD 1080p' : 'HD' ?></span>
                                        <?php endif; ?>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Footer -->
    <footer class="client-gallery-footer">
        <div class="footer-inner">
            <div class="footer-studio"><?= htmlspecialchars($settings['studio_name'] ?? 'DR FILMS CINEMA') ?></div>
            <p>Crafted with love for <?= htmlspecialchars($wedding['couple_name']) ?>. Google Drive Cloud Streaming Delivery.</p>
        </div>
    </footer>
</div>

<!-- Cinema Video Modal Player -->
<div id="videoModal" class="video-modal-backdrop" style="display: none;">
    <div class="video-modal-dialog">
        <div class="video-modal-header">
            <div>
                <span id="modalEventName" class="modal-event-badge">Main Event</span>
                <h3 id="modalVideoTitle" class="modal-video-title">Wedding Highlight Film</h3>
            </div>
            <button class="modal-close-btn" onclick="closeVideoPlayer()">✕</button>
        </div>
        <div class="video-player-container">
            <video id="cinemaPlayer" controls preload="metadata" playsinline class="cinema-video-element">
                <source src="" type="video/mp4" id="videoSource">
                Your browser does not support HTML5 video streaming.
            </video>
            <div id="playerBuffering" class="player-buffering-overlay" style="display: none;">
                <div class="spinner"></div>
                <p>Buffering high-definition stream from Google Drive...</p>
            </div>
        </div>
    </div>
</div>

<script>
function filterEvent(eventId, btn) {
    document.querySelectorAll('.gallery-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const sections = document.querySelectorAll('.client-event-section');
    sections.forEach(sec => {
        if (eventId === 'all' || sec.id === eventId) {
            sec.style.display = 'block';
        } else {
            sec.style.display = 'none';
        }
    });
}
</script>
