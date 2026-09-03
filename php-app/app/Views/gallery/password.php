<div class="password-gate-wrapper">
    <div class="password-gate-card">
        <div class="gate-icon">🔒</div>
        <div class="gate-pretitle">PRIVATE WEDDING GALLERY</div>
        <h1 class="gate-title"><?= htmlspecialchars($wedding['couple_name']) ?></h1>
        <p class="gate-subtitle">Please enter the private password provided by the couple or studio to unlock your wedding films.</p>

        <?php if (!empty($error)): ?>
            <div class="alert alert-error mb-4">
                <span><?= htmlspecialchars($error) ?></span>
            </div>
        <?php endif; ?>

        <form action="/gallery/<?= htmlspecialchars($gallery['access_code']) ?>/unlock" method="POST" class="gate-form">
            <div class="form-group">
                <input type="password" name="password" class="form-control gate-input" placeholder="Enter gallery password" required autofocus>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Unlock Wedding Films</button>
        </form>

        <div class="gate-footer">
            <p>Protected by Wedding Video Gallery Platform</p>
        </div>
    </div>
</div>
