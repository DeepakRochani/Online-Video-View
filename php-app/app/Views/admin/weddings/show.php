<div class="page-header-back">
    <a href="/admin/dashboard" class="back-link">← Back to Dashboard</a>
</div>

<div class="project-hero">
    <div class="project-hero-content">
        <div class="project-meta-badge"><?= $wedding['wedding_date'] ? date('F d, Y', strtotime($wedding['wedding_date'])) : 'Wedding Film Project' ?></div>
        <h1 class="project-title"><?= htmlspecialchars($wedding['couple_name']) ?></h1>
        <div class="project-actions">
            <a href="/admin/weddings/<?= (int)$wedding['id'] ?>/edit" class="btn btn-sm btn-outline">Edit Details</a>
            <form action="/admin/weddings/<?= (int)$wedding['id'] ?>/delete" method="POST" class="inline-form" onsubmit="return confirm('Are you sure you want to delete this wedding project?');">
                <button type="submit" class="btn btn-sm btn-outline-danger">Delete Project</button>
            </form>
        </div>
    </div>
</div>

<div class="admin-details-grid">
    <!-- Left Column: Google Drive & Client Gallery Controls -->
    <div class="sidebar-controls">
        <!-- Client Delivery Card -->
        <div class="content-card mb-4">
            <h3 class="card-title-sm">Client Delivery Link</h3>
            <p class="text-muted-sm">Share this private link with <?= htmlspecialchars($wedding['couple_name']) ?>:</p>
            
            <div class="share-box">
                <input type="text" readonly value="<?= (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') ?>/gallery/<?= htmlspecialchars($gallery['access_code'] ?? '') ?>" id="shareLinkInput" class="form-control-copy">
                <button class="btn btn-sm btn-primary" onclick="navigator.clipboard.writeText(document.getElementById('shareLinkInput').value); alert('Gallery link copied to clipboard!');">Copy</button>
            </div>

            <div class="share-meta mt-3">
                <div class="share-status-item">
                    <span>Access Code:</span>
                    <strong><?= htmlspecialchars($gallery['access_code'] ?? '') ?></strong>
                </div>
                <div class="share-status-item">
                    <span>Password:</span>
                    <strong><?= !empty($gallery['is_password_protected']) ? '🔒 Protected' : '🔓 Public Link' ?></strong>
                </div>
                <div class="mt-3">
                    <a href="/gallery/<?= htmlspecialchars($gallery['access_code'] ?? '') ?>" target="_blank" class="btn btn-block btn-outline-gold">
                        Preview Client Gallery ↗
                    </a>
                </div>
            </div>
        </div>

        <!-- Google Drive Sync Card -->
        <div class="content-card">
            <h3 class="card-title-sm">Google Drive Storage</h3>
            <div class="drive-info-box">
                <div class="drive-meta-row">
                    <span>Folder ID:</span>
                    <code class="text-gold"><?= htmlspecialchars($wedding['drive_folder_id'] ?? 'Not set') ?></code>
                </div>
                <div class="drive-meta-row">
                    <span>Last Scan:</span>
                    <span><?= $wedding['last_scanned_at'] ? date('M d, Y H:i:s', strtotime($wedding['last_scanned_at'])) : 'Never' ?></span>
                </div>
                <div class="drive-meta-row">
                    <span>Detected Videos:</span>
                    <strong><?= count($videos) ?> Films</strong>
                </div>
            </div>

            <form action="/admin/weddings/<?= (int)$wedding['id'] ?>/scan" method="POST" id="scanForm" class="mt-4">
                <button type="submit" class="btn btn-block btn-primary" id="scanBtn">
                    <span id="scanBtnText">⚡ Scan / Rescan Google Drive</span>
                </button>
            </form>
            <div id="scanStatus" class="scan-status-message mt-2" style="display: none;"></div>
        </div>
    </div>

    <!-- Right Column: Films & Media Gallery -->
    <div class="main-media-pane">
        <div class="content-card">
            <div class="card-header-flex">
                <div>
                    <h2 class="card-title">Films & Media</h2>
                    <p class="card-subtitle">Video files detected in the connected Google Drive folder</p>
                </div>
                <span class="badge badge-gold"><?= count($videos) ?> Total Films</span>
            </div>

            <?php if (empty($videos)): ?>
                <div class="empty-state">
                    <div class="empty-icon">📂</div>
                    <h3>No videos detected in this folder yet</h3>
                    <p>Make sure your Google Drive folder contains video files (.mp4, .mov, etc.) or event subfolders, then click <strong>Scan Google Drive</strong>.</p>
                    <form action="/admin/weddings/<?= (int)$wedding['id'] ?>/scan" method="POST" class="mt-3">
                        <button type="submit" class="btn btn-primary">Scan Folder Now</button>
                    </form>
                </div>
            <?php else: ?>
                <div class="events-container">
                    <?php foreach ($events as $event): ?>
                        <div class="event-section">
                            <div class="event-header">
                                <h3 class="event-name">
                                    <span class="event-icon">✦</span>
                                    <?= htmlspecialchars($event['name']) ?>
                                </h3>
                                <span class="event-count"><?= count($event['videos']) ?> <?= count($event['videos']) === 1 ? 'Film' : 'Films' ?></span>
                            </div>

                            <div class="videos-grid">
                                <?php foreach ($event['videos'] as $v): ?>
                                    <div class="video-card" data-video-id="<?= (int)$v['id'] ?>" data-title="<?= htmlspecialchars($v['title']) ?>" data-event="<?= htmlspecialchars($event['name']) ?>" data-stream-url="/api/videos/<?= (int)$v['id'] ?>/stream">
                                        <div class="video-thumbnail-wrapper" onclick="openVideoPlayer(<?= (int)$v['id'] ?>, '<?= htmlspecialchars(addslashes($v['title'])) ?>', '<?= htmlspecialchars(addslashes($event['name'])) ?>', '/api/videos/<?= (int)$v['id'] ?>/stream')">
                                            <img src="<?= htmlspecialchars($v['thumbnail_url'] ?? "https://drive.google.com/thumbnail?id={$v['drive_file_id']}&sz=w1280") ?>" alt="<?= htmlspecialchars($v['title']) ?>" class="video-thumb" onerror="this.src='/assets/images/video-placeholder.jpg'">
                                            <div class="play-overlay">
                                                <div class="play-circle">▶</div>
                                            </div>
                                            <?php if ($v['duration_seconds']): ?>
                                                <span class="duration-badge"><?= sprintf('%02d:%02d', floor($v['duration_seconds'] / 60), $v['duration_seconds'] % 60) ?></span>
                                            <?php endif; ?>
                                        </div>
                                        <div class="video-info">
                                            <h4 class="video-title" title="<?= htmlspecialchars($v['title']) ?>"><?= htmlspecialchars($v['title']) ?></h4>
                                            <div class="video-meta">
                                                <span><?= round($v['file_size'] / (1024 * 1024), 1) ?> MB</span>
                                                <?php if ($v['width'] && $v['height']): ?>
                                                    <span>• <?= (int)$v['width'] ?>×<?= (int)$v['height'] ?></span>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
    </div>
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
                <p>Streaming from Google Drive...</p>
            </div>
        </div>
    </div>
</div>
