<div class="error-page-wrapper">
    <div class="error-card">
        <div class="error-code">404</div>
        <h1 class="error-title"><?= htmlspecialchars($message ?? 'Gallery or Page Not Found') ?></h1>
        <p class="error-desc">The wedding gallery or requested link could not be located. It may have expired or the link is incorrect.</p>
        <div class="mt-4">
            <a href="/admin/login" class="btn btn-outline-gold">Photographer Sign In</a>
        </div>
    </div>
</div>
