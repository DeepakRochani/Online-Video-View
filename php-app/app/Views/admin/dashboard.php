<div class="dashboard-header">
    <div>
        <h1 class="page-title">Wedding Projects</h1>
        <p class="page-subtitle">Manage client film delivery and Google Drive media connections</p>
    </div>
    <div class="header-actions">
        <a href="/admin/weddings/create" class="btn btn-primary">+ Create New Wedding</a>
    </div>
</div>

<div class="stats-grid">
    <div class="stat-card">
        <div class="stat-label">Total Weddings</div>
        <div class="stat-value"><?= (int)$totalWeddings ?></div>
    </div>
    <div class="stat-card">
        <div class="stat-label">Videos Delivered</div>
        <div class="stat-value"><?= (int)$totalVideos ?></div>
    </div>
    <div class="stat-card">
        <div class="stat-label">Google Drive Status</div>
        <div class="stat-status">
            <?php if ($driveConnection): ?>
                <span class="badge badge-success">● Connected (OAuth)</span>
                <form action="/admin/drive/disconnect" method="POST" class="inline-form" onsubmit="return confirm('Disconnect Google Drive?');">
                    <button type="submit" class="btn-link-danger">Disconnect</button>
                </form>
            <?php else: ?>
                <span class="badge badge-warning">● Link Scan Mode</span>
                <a href="/admin/drive/connect" class="btn btn-xs btn-outline-gold">Connect OAuth</a>
            <?php endif; ?>
        </div>
    </div>
</div>

<div class="content-card">
    <div class="card-header-flex">
        <h2 class="card-title">All Weddings</h2>
        <span class="card-count"><?= count($weddings) ?> Projects</span>
    </div>

    <?php if (empty($weddings)): ?>
        <div class="empty-state">
            <div class="empty-icon">🎬</div>
            <h3>No wedding projects created yet</h3>
            <p>Create your first wedding project and connect your Google Drive folder to begin delivering films to your clients.</p>
            <a href="/admin/weddings/create" class="btn btn-primary mt-4">Create First Wedding</a>
        </div>
    <?php else: ?>
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Couple Name</th>
                        <th>Wedding Date</th>
                        <th>Drive Status</th>
                        <th>Films</th>
                        <th>Client Gallery</th>
                        <th>Last Scanned</th>
                        <th class="text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($weddings as $w): ?>
                        <tr>
                            <td>
                                <a href="/admin/weddings/<?= (int)$w['id'] ?>" class="couple-name-link">
                                    <strong><?= htmlspecialchars($w['couple_name']) ?></strong>
                                </a>
                            </td>
                            <td><?= $w['wedding_date'] ? date('M d, Y', strtotime($w['wedding_date'])) : '—' ?></td>
                            <td>
                                <?php if (!empty($w['drive_folder_id'])): ?>
                                    <span class="badge badge-success" title="Folder ID: <?= htmlspecialchars($w['drive_folder_id']) ?>">Connected</span>
                                <?php else: ?>
                                    <span class="badge badge-muted">Not Set</span>
                                <?php endif; ?>
                            </td>
                            <td><strong><?= (int)($w['total_videos'] ?? 0) ?></strong> videos</td>
                            <td>
                                <a href="/gallery/<?= htmlspecialchars($w['access_code'] ?? '') ?>" target="_blank" class="gallery-share-link">
                                    /gallery/<?= htmlspecialchars($w['access_code'] ?? '') ?> ↗
                                </a>
                            </td>
                            <td><?= $w['last_scanned_at'] ? date('M d, H:i', strtotime($w['last_scanned_at'])) : 'Never' ?></td>
                            <td class="text-right">
                                <a href="/admin/weddings/<?= (int)$w['id'] ?>" class="btn btn-xs btn-outline">Manage</a>
                                <a href="/admin/weddings/<?= (int)$w['id'] ?>/edit" class="btn btn-xs btn-outline">Edit</a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>
