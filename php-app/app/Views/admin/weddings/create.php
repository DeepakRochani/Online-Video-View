<div class="page-header-back">
    <a href="/admin/dashboard" class="back-link">← Back to Dashboard</a>
</div>

<div class="form-card-container">
    <div class="content-card">
        <div class="card-header">
            <h1 class="card-title">Create Wedding Project</h1>
            <p class="card-subtitle">Enter wedding details and connect your Google Drive folder where your films are stored.</p>
        </div>

        <form action="/admin/weddings" method="POST" class="wedding-form">
            <div class="form-section">
                <h3 class="section-title">1. Wedding Information</h3>
                
                <div class="form-group">
                    <label for="couple_name" class="form-label">Couple Name <span class="required">*</span></label>
                    <input type="text" id="couple_name" name="couple_name" class="form-control" placeholder="e.g. Harshil & Jahnavi" required>
                    <span class="form-hint">This will be prominently displayed on the cinema gallery banner.</span>
                </div>

                <div class="form-grid-2">
                    <div class="form-group">
                        <label for="wedding_date" class="form-label">Wedding Date</label>
                        <input type="date" id="wedding_date" name="wedding_date" class="form-control">
                    </div>

                    <div class="form-group">
                        <label for="banner_image_url" class="form-label">Cover Banner Image URL</label>
                        <input type="url" id="banner_image_url" name="banner_image_url" class="form-control" placeholder="https://example.com/banner.jpg">
                        <span class="form-hint">High-resolution wedding photo for the gallery background.</span>
                    </div>
                </div>
            </div>

            <div class="form-section">
                <h3 class="section-title">2. Google Drive Storage Connection</h3>
                <div class="form-group">
                    <label for="drive_folder_url" class="form-label">Google Drive Folder Link or Folder ID</label>
                    <input type="text" id="drive_folder_url" name="drive_folder_url" class="form-control" placeholder="https://drive.google.com/drive/folders/13Kho6u93_s1mtJnjMXwXgwMTzivbIRXq">
                    <span class="form-hint">Paste your Google Drive folder link. Subfolders (e.g. Baraat, Haldi, Sangeet) and video files will be scanned automatically.</span>
                </div>
            </div>

            <div class="form-section">
                <h3 class="section-title">3. Client Gallery Security</h3>
                <div class="form-group-checkbox">
                    <label class="checkbox-label">
                        <input type="checkbox" name="require_password" value="1" id="require_password_toggle" onchange="document.getElementById('password_field').style.display = this.checked ? 'block' : 'none';">
                        <span>Require password to view wedding films</span>
                    </label>
                </div>

                <div class="form-group mt-3" id="password_field" style="display: none;">
                    <label for="gallery_password" class="form-label">Gallery Access Password</label>
                    <input type="text" id="gallery_password" name="gallery_password" class="form-control" placeholder="e.g. harshil2026">
                    <span class="form-hint">Share this password with the couple for private viewing.</span>
                </div>
            </div>

            <div class="form-actions">
                <a href="/admin/dashboard" class="btn btn-outline">Cancel</a>
                <button type="submit" class="btn btn-primary">Create Project & Scan Videos</button>
            </div>
        </form>
    </div>
</div>
