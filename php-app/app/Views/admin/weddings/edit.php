<div class="page-header-back">
    <a href="/admin/weddings/<?= (int)$wedding['id'] ?>" class="back-link">← Back to Wedding Project</a>
</div>

<div class="form-card-container">
    <div class="content-card">
        <div class="card-header">
            <h1 class="card-title">Edit Wedding Project</h1>
            <p class="card-subtitle">Update wedding details, Google Drive link, or client access password.</p>
        </div>

        <form action="/admin/weddings/<?= (int)$wedding['id'] ?>" method="POST" class="wedding-form">
            <div class="form-section">
                <h3 class="section-title">1. Wedding Information</h3>
                
                <div class="form-group">
                    <label for="couple_name" class="form-label">Couple Name <span class="required">*</span></label>
                    <input type="text" id="couple_name" name="couple_name" class="form-control" value="<?= htmlspecialchars($wedding['couple_name'] ?? '') ?>" required>
                </div>

                <div class="form-grid-2">
                    <div class="form-group">
                        <label for="wedding_date" class="form-label">Wedding Date</label>
                        <input type="date" id="wedding_date" name="wedding_date" class="form-control" value="<?= htmlspecialchars($wedding['wedding_date'] ?? '') ?>">
                    </div>

                    <div class="form-group">
                        <label for="banner_image_url" class="form-label">Cover Banner Image URL</label>
                        <input type="url" id="banner_image_url" name="banner_image_url" class="form-control" value="<?= htmlspecialchars($wedding['banner_image_url'] ?? '') ?>" placeholder="https://example.com/banner.jpg">
                    </div>
                </div>
            </div>

            <div class="form-section">
                <h3 class="section-title">2. Google Drive Storage Connection</h3>
                <div class="form-group">
                    <label for="drive_folder_url" class="form-label">Google Drive Folder Link or Folder ID</label>
                    <input type="text" id="drive_folder_url" name="drive_folder_url" class="form-control" value="<?= htmlspecialchars($wedding['drive_folder_url'] ?? $wedding['drive_folder_id'] ?? '') ?>">
                    <span class="form-hint">Updating this will allow rescanning new videos from this folder.</span>
                </div>
            </div>

            <div class="form-section">
                <h3 class="section-title">3. Client Gallery Security</h3>
                <div class="form-group-checkbox">
                    <label class="checkbox-label">
                        <input type="checkbox" name="require_password" value="1" id="require_password_toggle" <?= !empty($gallery['is_password_protected']) ? 'checked' : '' ?> onchange="document.getElementById('password_field').style.display = this.checked ? 'block' : 'none';">
                        <span>Require password to view wedding films</span>
                    </label>
                </div>

                <div class="form-group mt-3" id="password_field" style="display: <?= !empty($gallery['is_password_protected']) ? 'block' : 'none' ?>;">
                    <label for="gallery_password" class="form-label">New Gallery Access Password (Leave blank to keep current password)</label>
                    <input type="text" id="gallery_password" name="gallery_password" class="form-control" placeholder="Enter new password">
                </div>
            </div>

            <div class="form-actions">
                <a href="/admin/weddings/<?= (int)$wedding['id'] ?>" class="btn btn-outline">Cancel</a>
                <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
        </form>
    </div>
</div>
