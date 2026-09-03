<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($title ?? 'Wedding Video Gallery - Admin') ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body class="admin-body">
    <?php if (\App\Core\Auth::check()): ?>
    <header class="admin-nav">
        <div class="nav-container">
            <div class="nav-brand">
                <a href="/admin/dashboard" class="brand-link">
                    <span class="brand-badge">PRO</span>
                    <span class="brand-text">Wedding Video Gallery</span>
                </a>
            </div>
            <nav class="nav-links">
                <a href="/admin/dashboard" class="nav-item <?= str_contains($_SERVER['REQUEST_URI'] ?? '', '/dashboard') ? 'active' : '' ?>">Dashboard</a>
                <a href="/admin/weddings/create" class="nav-item <?= str_contains($_SERVER['REQUEST_URI'] ?? '', '/weddings/create') ? 'active' : '' ?>">+ New Wedding</a>
                <a href="/admin/settings" class="nav-item <?= str_contains($_SERVER['REQUEST_URI'] ?? '', '/settings') ? 'active' : '' ?>">Settings</a>
                <div class="nav-user">
                    <span class="user-email"><?= htmlspecialchars(\App\Core\Auth::user()['email'] ?? '') ?></span>
                    <a href="/admin/logout" class="btn btn-sm btn-outline">Logout</a>
                </div>
            </nav>
        </div>
    </header>
    <?php endif; ?>

    <main class="admin-main">
        <div class="container">
            <?php if ($flashSuccess = \App\Core\Session::flash('success')): ?>
                <div class="alert alert-success">
                    <span class="alert-icon">✓</span>
                    <span><?= htmlspecialchars($flashSuccess) ?></span>
                </div>
            <?php endif; ?>

            <?php if ($flashWarning = \App\Core\Session::flash('warning')): ?>
                <div class="alert alert-warning">
                    <span class="alert-icon">⚠</span>
                    <span><?= htmlspecialchars($flashWarning) ?></span>
                </div>
            <?php endif; ?>

            <?php if ($flashError = \App\Core\Session::flash('error')): ?>
                <div class="alert alert-error">
                    <span class="alert-icon">✕</span>
                    <span><?= htmlspecialchars($flashError) ?></span>
                </div>
            <?php endif; ?>

            <?= $content ?>
        </div>
    </main>

    <footer class="admin-footer">
        <div class="container">
            <p>&copy; <?= date('Y') ?> Wedding Video Gallery Platform. Google Drive Wedding Video Delivery Engine.</p>
        </div>
    </footer>

    <script src="/assets/js/player.js"></script>
    <script src="/assets/js/scanner.js"></script>
</body>
</html>
