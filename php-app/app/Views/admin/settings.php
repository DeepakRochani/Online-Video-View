<div class="page-header">
    <h1 class="page-title">Studio & Branding Settings</h1>
    <p class="page-subtitle">Customize your photography studio branding shown on client video galleries</p>
</div>

<div class="form-card-container">
    <div class="content-card">
        <form action="/admin/settings" method="POST" class="wedding-form">
            <div class="form-section">
                <div class="form-group">
                    <label for="studio_name" class="form-label">Photography Studio Name</label>
                    <input type="text" id="studio_name" name="studio_name" class="form-control" value="<?= htmlspecialchars($settings['studio_name'] ?? 'DR Films & Cinema') ?>" placeholder="e.g. DR Films">
                </div>

                <div class="form-grid-2">
                    <div class="form-group">
                        <label for="primary_color" class="form-label">Brand Accent Color (Hex)</label>
                        <div class="color-picker-wrapper">
                            <input type="color" id="primary_color_picker" value="<?= htmlspecialchars($settings['primary_color'] ?? '#D4AF37') ?>" onchange="document.getElementById('primary_color').value = this.value;">
                            <input type="text" id="primary_color" name="primary_color" class="form-control" value="<?= htmlspecialchars($settings['primary_color'] ?? '#D4AF37') ?>">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="contact_email" class="form-label">Studio Contact Email</label>
                        <input type="email" id="contact_email" name="contact_email" class="form-control" value="<?= htmlspecialchars($settings['contact_email'] ?? '') ?>" placeholder="contact@studio.com">
                    </div>
                </div>

                <div class="form-group">
                    <label for="logo_url" class="form-label">Studio Logo Image URL</label>
                    <input type="url" id="logo_url" name="logo_url" class="form-control" value="<?= htmlspecialchars($settings['logo_url'] ?? '') ?>" placeholder="https://example.com/logo.png">
                    <span class="form-hint">Displayed at the top and footer of your client cinema galleries.</span>
                </div>
            </div>

            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Save Branding Settings</button>
            </div>
        </form>
    </div>
</div>
