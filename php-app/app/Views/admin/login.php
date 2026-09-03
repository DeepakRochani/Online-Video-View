<div class="auth-wrapper">
    <div class="auth-card">
        <div class="auth-header">
            <div class="brand-badge-large">WEDDING CINEMA</div>
            <h1 class="auth-title">Photographer Sign In</h1>
            <p class="auth-subtitle">Deliver timeless wedding memories directly from your Google Drive</p>
        </div>

        <form action="/admin/login" method="POST" class="auth-form">
            <div class="form-group">
                <label for="email" class="form-label">Email Address</label>
                <input type="email" id="email" name="email" class="form-control" placeholder="photographer@studio.com" required autofocus>
            </div>

            <div class="form-group">
                <label for="password" class="form-label">Password</label>
                <input type="password" id="password" name="password" class="form-control" placeholder="••••••••" required>
            </div>

            <button type="submit" class="btn btn-primary btn-block">Sign In to Dashboard</button>
        </form>

        <div class="auth-footer-note">
            <p>Default credentials: <code>admin@weddinggallery.com</code> / <code>password123</code></p>
        </div>
    </div>
</div>
