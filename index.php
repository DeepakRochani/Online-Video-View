<?php
/**
 * ============================================================================
 * WEDDING VIDEO GALLERY — COMPLETE SINGLE-FILE APPLICATION
 * ============================================================================
 * 
 * A complete, standalone client video delivery platform for wedding photographers.
 * Google Drive acts as the cloud storage engine for high-definition video files.
 * The application stores only metadata, manages client galleries, permissions,
 * and streams videos via HTTP Range 206 Partial Content.
 * 
 * Requirements: PHP 8.2+, PDO (MySQL or SQLite), cURL, OpenSSL
 * All backend logic, database, OAuth, Drive API, streaming, HTML, CSS, and JS
 * are entirely self-contained within this single file.
 */

declare(strict_types=1);

// Disable direct memory buffering for high-throughput video streaming
if (function_exists('ini_set')) {
    ini_set('memory_limit', '256M');
    ini_set('max_execution_time', '0');
}

// Start secure session
if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax',
    ]);
}

// ============================================================================
// 1. CONFIGURATION SECTION
// ============================================================================
// Update the constants below or provide matching Environment Variables.

// Database Credentials
define('DB_TYPE', getenv('DB_TYPE') ?: 'mysql'); // 'mysql' or 'sqlite'
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'wedding_gallery');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');
define('DB_SQLITE_PATH', __DIR__ . '/storage/database.sqlite');

// Google OAuth 2.0 Credentials (From Google Cloud Console: https://console.cloud.google.com)
// Enable "Google Drive API" -> Credentials -> OAuth 2.0 Client ID (Web Application)
define('GOOGLE_CLIENT_ID', getenv('GOOGLE_CLIENT_ID') ?: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com');
define('GOOGLE_CLIENT_SECRET', getenv('GOOGLE_CLIENT_SECRET') ?: 'YOUR_GOOGLE_CLIENT_SECRET');

// Google OAuth Redirect URI (Must match the Authorized redirect URIs in Google Cloud Console)
define('GOOGLE_REDIRECT_URI', getenv('GOOGLE_REDIRECT_URI') ?: ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . strtok($_SERVER['REQUEST_URI'] ?? '', '?') . '?action=google_callback'));

// Google Drive API Key (Optional fallback for public link-shared folders)
define('GOOGLE_API_KEY', getenv('GOOGLE_API_KEY') ?: '');

// Application Branding & Settings
define('APP_NAME', 'Wedding Video Gallery');
define('APP_SECRET', getenv('APP_SECRET') ?: 'wedding_gallery_secure_encryption_key_2026');

// ============================================================================
// 2. HELPER UTILITIES & SECURITY
// ============================================================================

function e(?string $string): string {
    return htmlspecialchars((string)$string, ENT_QUOTES, 'UTF-8');
}

function generateCsrfToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCsrfToken(?string $token): bool {
    return !empty($token) && !empty($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

function jsonResponse(array $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function redirect(string $url): void {
    header("Location: {$url}");
    exit;
}

function setFlash(string $type, string $message): void {
    $_SESSION['flash'][$type] = $message;
}

function getFlash(string $type): ?string {
    if (!empty($_SESSION['flash'][$type])) {
        $msg = $_SESSION['flash'][$type];
        unset($_SESSION['flash'][$type]);
        return $msg;
    }
    return null;
}

function logMessage(string $message, string $level = 'INFO'): void {
    $logDir = __DIR__ . '/storage/logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }
    $logFile = $logDir . '/app_' . date('Y-m-d') . '.log';
    $time = date('Y-m-d H:i:s');
    $entry = "[{$time}] [{$level}] {$message}\n";
    @file_put_contents($logFile, $entry, FILE_APPEND);
}

function formatBytes(int $bytes, int $precision = 2): string {
    if ($bytes <= 0) return '0 B';
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    $bytes /= pow(1024, $pow);
    return round($bytes, $precision) . ' ' . $units[$pow];
}

function formatDuration(?int $seconds): string {
    if (!$seconds || $seconds <= 0) return '';
    $m = floor($seconds / 60);
    $s = $seconds % 60;
    return sprintf('%02d:%02d', $m, $s);
}

// AES-256 Token Encryption for OAuth Refresh Tokens
function encryptSecret(string $plainText): string {
    $key = hash('sha256', APP_SECRET, true);
    $iv = random_bytes(16);
    $cipherText = openssl_encrypt($plainText, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
    return base64_encode($iv . $cipherText);
}

function decryptSecret(string $cipherTextBase64): string {
    $data = base64_decode($cipherTextBase64);
    if (strlen($data) < 17) return '';
    $key = hash('sha256', APP_SECRET, true);
    $iv = substr($data, 0, 16);
    $cipher = substr($data, 16);
    $decrypted = openssl_decrypt($cipher, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
    return $decrypted !== false ? $decrypted : '';
}

// ============================================================================
// 3. DATABASE CONNECTION & AUTO-INITIALIZATION
// ============================================================================

function getDb(): PDO {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    try {
        if (DB_TYPE === 'sqlite') {
            $dir = dirname(DB_SQLITE_PATH);
            if (!is_dir($dir)) @mkdir($dir, 0755, true);
            $pdo = new PDO('sqlite:' . DB_SQLITE_PATH, null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
        } else {
            // First connect without DB to create database if missing
            $dsnNoDb = sprintf('mysql:host=%s;port=%s;charset=utf8mb4', DB_HOST, DB_PORT);
            $initPdo = new PDO($dsnNoDb, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            ]);
            $initPdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

            $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        }
    } catch (PDOException $e) {
        // Fallback to local SQLite if MySQL server is unreachable in development
        logMessage("MySQL Connection failed: " . $e->getMessage() . ". Falling back to SQLite.", "WARNING");
        $dir = dirname(DB_SQLITE_PATH);
        if (!is_dir($dir)) @mkdir($dir, 0755, true);
        $pdo = new PDO('sqlite:' . DB_SQLITE_PATH, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }

    // Auto-migrate tables if not created
    initDatabaseSchema($pdo);

    return $pdo;
}

function initDatabaseSchema(PDO $pdo): void {
    $isSqlite = ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite');
    $autoInc = $isSqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT AUTO_INCREMENT PRIMARY KEY';
    $timestampDef = $isSqlite ? 'DATETIME DEFAULT CURRENT_TIMESTAMP' : 'DATETIME DEFAULT CURRENT_TIMESTAMP';

    $schema = [
        "CREATE TABLE IF NOT EXISTS users (
            id {$autoInc},
            name VARCHAR(191) NOT NULL,
            email VARCHAR(191) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            studio_name VARCHAR(191) DEFAULT NULL,
            created_at {$timestampDef},
            updated_at {$timestampDef}
        );",

        "CREATE TABLE IF NOT EXISTS weddings (
            id {$autoInc},
            user_id INT NOT NULL,
            couple_name VARCHAR(191) NOT NULL,
            wedding_date DATE DEFAULT NULL,
            package_name VARCHAR(191) DEFAULT NULL,
            cover_image TEXT DEFAULT NULL,
            welcome_message TEXT DEFAULT NULL,
            drive_folder_id VARCHAR(191) DEFAULT NULL,
            drive_folder_url TEXT DEFAULT NULL,
            status VARCHAR(50) DEFAULT 'active',
            last_scanned_at DATETIME DEFAULT NULL,
            total_videos INT DEFAULT 0,
            created_at {$timestampDef},
            updated_at {$timestampDef}
        );",

        "CREATE TABLE IF NOT EXISTS drive_connections (
            id {$autoInc},
            wedding_id INT DEFAULT NULL,
            user_id INT NOT NULL,
            google_account_id VARCHAR(191) DEFAULT NULL,
            folder_id VARCHAR(191) DEFAULT NULL,
            folder_name VARCHAR(191) DEFAULT NULL,
            access_token TEXT DEFAULT NULL,
            refresh_token TEXT DEFAULT NULL,
            token_expires_at DATETIME DEFAULT NULL,
            resource_key VARCHAR(191) DEFAULT NULL,
            status VARCHAR(50) DEFAULT 'connected',
            last_synced_at DATETIME DEFAULT NULL,
            created_at {$timestampDef},
            updated_at {$timestampDef}
        );",

        "CREATE TABLE IF NOT EXISTS events (
            id {$autoInc},
            wedding_id INT NOT NULL,
            drive_folder_id VARCHAR(191) DEFAULT NULL,
            parent_folder_id VARCHAR(191) DEFAULT NULL,
            name VARCHAR(191) NOT NULL,
            sort_order INT DEFAULT 0,
            created_at {$timestampDef},
            updated_at {$timestampDef}
        );",

        "CREATE TABLE IF NOT EXISTS videos (
            id {$autoInc},
            wedding_id INT NOT NULL,
            event_id INT DEFAULT NULL,
            drive_file_id VARCHAR(191) NOT NULL UNIQUE,
            drive_folder_id VARCHAR(191) DEFAULT NULL,
            name VARCHAR(255) NOT NULL,
            mime_type VARCHAR(100) DEFAULT 'video/mp4',
            file_size BIGINT DEFAULT 0,
            duration_seconds INT DEFAULT NULL,
            width INT DEFAULT NULL,
            height INT DEFAULT NULL,
            thumbnail_url TEXT DEFAULT NULL,
            web_view_url TEXT DEFAULT NULL,
            created_time VARCHAR(100) DEFAULT NULL,
            modified_time VARCHAR(100) DEFAULT NULL,
            sort_order INT DEFAULT 0,
            status VARCHAR(50) DEFAULT 'ready',
            created_at {$timestampDef},
            updated_at {$timestampDef}
        );",

        "CREATE TABLE IF NOT EXISTS client_galleries (
            id {$autoInc},
            wedding_id INT NOT NULL,
            gallery_code VARCHAR(64) NOT NULL UNIQUE,
            secure_token_hash VARCHAR(255) DEFAULT NULL,
            password_hash VARCHAR(255) DEFAULT NULL,
            password_enabled INT DEFAULT 0,
            allow_download INT DEFAULT 0,
            allow_fullscreen INT DEFAULT 1,
            show_branding INT DEFAULT 1,
            status VARCHAR(50) DEFAULT 'active',
            created_at {$timestampDef},
            updated_at {$timestampDef}
        );",

        "CREATE TABLE IF NOT EXISTS gallery_settings (
            id {$autoInc},
            user_id INT NOT NULL,
            setting_key VARCHAR(100) NOT NULL,
            setting_value TEXT DEFAULT NULL,
            created_at {$timestampDef},
            updated_at {$timestampDef}
        );",

        "CREATE TABLE IF NOT EXISTS client_sessions (
            id {$autoInc},
            gallery_id INT NOT NULL,
            ip_address VARCHAR(100) DEFAULT NULL,
            user_agent TEXT DEFAULT NULL,
            last_active_at {$timestampDef},
            created_at {$timestampDef}
        );"
    ];

    foreach ($schema as $sql) {
        $pdo->exec($sql);
    }
}

// ============================================================================
// 4. GOOGLE DRIVE & OAUTH ENGINE (cURL NATIVE)
// ============================================================================

function extractGoogleDriveFolderId(?string $url): ?string {
    if (empty($url)) return null;
    $url = trim($url);

    // Bare folder ID check (25-45 characters alphanumeric with dashes/underscores)
    if (preg_match('/^[a-zA-Z0-9_-]{25,45}$/', $url)) {
        return $url;
    }

    // Google Drive folder URL patterns
    if (preg_match('#/folders/([a-zA-Z0-9_-]{25,45})#', $url, $matches)) {
        return $matches[1];
    }

    if (preg_match('#[?&]id=([a-zA-Z0-9_-]{25,45})#', $url, $matches)) {
        return $matches[1];
    }

    if (preg_match('#/d/([a-zA-Z0-9_-]{25,45})#', $url, $matches)) {
        return $matches[1];
    }

    return null;
}

function isVideoFile(string $mimeType, string $filename): bool {
    $videoMimes = [
        'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo',
        'video/x-matroska', 'video/x-m4v', 'video/mpeg', 'video/ogg', 'video/3gpp', 'video/mp2t'
    ];

    if (in_array(strtolower($mimeType), $videoMimes, true) || str_starts_with($mimeType, 'video/')) {
        return true;
    }

    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    $videoExts = ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', 'mpeg', 'mpg', '3gp', 'ts', 'm2ts', 'wmv'];
    return in_array($ext, $videoExts, true);
}

function getGoogleAuthUrl(string $state = ''): string {
    $params = [
        'client_id' => GOOGLE_CLIENT_ID,
        'redirect_uri' => GOOGLE_REDIRECT_URI,
        'response_type' => 'code',
        'scope' => 'https://www.googleapis.com/auth/drive.readonly',
        'access_type' => 'offline',
        'prompt' => 'consent',
        'state' => $state,
    ];
    return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);
}

function exchangeGoogleAuthCode(string $code): array {
    $url = 'https://oauth2.googleapis.com/token';
    $params = [
        'code' => $code,
        'client_id' => GOOGLE_CLIENT_ID,
        'client_secret' => GOOGLE_CLIENT_SECRET,
        'redirect_uri' => GOOGLE_REDIRECT_URI,
        'grant_type' => 'authorization_code',
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($params),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_TIMEOUT => 20,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        throw new RuntimeException("Google OAuth token exchange failed (HTTP {$httpCode}): {$response}");
    }

    return json_decode((string)$response, true) ?? [];
}

function refreshGoogleAccessToken(string $encryptedRefreshToken): array {
    $refreshToken = decryptSecret($encryptedRefreshToken);
    if (empty($refreshToken)) {
        throw new RuntimeException("Refresh token decryption failed.");
    }

    $url = 'https://oauth2.googleapis.com/token';
    $params = [
        'refresh_token' => $refreshToken,
        'client_id' => GOOGLE_CLIENT_ID,
        'client_secret' => GOOGLE_CLIENT_SECRET,
        'grant_type' => 'refresh_token',
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($params),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_TIMEOUT => 20,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        throw new RuntimeException("Google OAuth token refresh failed (HTTP {$httpCode}): {$response}");
    }

    return json_decode((string)$response, true) ?? [];
}

function getValidGoogleAccessToken(int $userId, PDO $pdo): string {
    $stmt = $pdo->prepare("SELECT * FROM drive_connections WHERE user_id = ? ORDER BY id DESC LIMIT 1");
    $stmt->execute([$userId]);
    $conn = $stmt->fetch();

    if (!$conn) {
        return '';
    }

    $accessToken = $conn['access_token'] ?? '';
    $expiresAt = !empty($conn['token_expires_at']) ? strtotime($conn['token_expires_at']) : 0;

    // If expired or expiring in under 90 seconds, refresh
    if ($expiresAt > 0 && $expiresAt <= (time() + 90) && !empty($conn['refresh_token'])) {
        try {
            $tokens = refreshGoogleAccessToken($conn['refresh_token']);
            $accessToken = $tokens['access_token'] ?? $accessToken;
            $newExpiresAt = date('Y-m-d H:i:s', time() + ($tokens['expires_in'] ?? 3600));

            $upStmt = $pdo->prepare("UPDATE drive_connections SET access_token = ?, token_expires_at = ?, updated_at = ? WHERE id = ?");
            $upStmt->execute([$accessToken, $newExpiresAt, date('Y-m-d H:i:s'), $conn['id']]);
        } catch (Throwable $e) {
            logMessage("Failed to auto-refresh Google access token: " . $e->getMessage(), "ERROR");
        }
    }

    return $accessToken;
}

function driveListFiles(string $folderId, string $accessToken = '', string $pageToken = '', string $apiKey = ''): array {
    $q = sprintf("'%s' in parents and trashed = false", addslashes($folderId));
    $fields = 'nextPageToken, files(id, name, mimeType, size, videoMediaMetadata, thumbnailLink, webViewLink, createdTime, modifiedTime, parents)';

    $params = [
        'q' => $q,
        'pageSize' => 100,
        'fields' => $fields,
        'supportsAllDrives' => 'true',
        'includeItemsFromAllDrives' => 'true',
        'orderBy' => 'folder, name_natural asc, modifiedTime desc',
    ];

    if (!empty($pageToken)) $params['pageToken'] = $pageToken;
    if (empty($accessToken) && !empty($apiKey)) $params['key'] = $apiKey;

    $url = 'https://www.googleapis.com/drive/v3/files?' . http_build_query($params);

    $headers = [];
    if (!empty($accessToken)) {
        $headers[] = 'Authorization: Bearer ' . $accessToken;
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_FOLLOWLOCATION => true,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 401) {
        throw new RuntimeException("Google Drive authentication token expired or invalid (HTTP 401).", 401);
    }
    if ($httpCode === 403) {
        throw new RuntimeException("Google Drive permission denied (HTTP 403). Make sure the folder is shared or authorized.", 403);
    }
    if ($httpCode === 404) {
        throw new RuntimeException("Google Drive folder not found (HTTP 404). Verify the Folder ID.", 404);
    }
    if ($httpCode !== 200) {
        throw new RuntimeException("Google Drive API query error (HTTP {$httpCode}): {$response}", $httpCode);
    }

    return json_decode((string)$response, true) ?? [];
}

/**
 * Recursive scanner: Scans the folder and all nested subfolders, creating events & storing video metadata
 */
function scanFolderRecursive(PDO $pdo, int $weddingId, string $folderId, ?string $parentFolderId, string $eventName, string $accessToken, string $apiKey, array &$visitedFolders = []): array {
    if (isset($visitedFolders[$folderId])) {
        return ['events' => 0, 'videos' => 0];
    }
    $visitedFolders[$folderId] = true;

    $stats = ['events' => 0, 'videos' => 0];
    $pageToken = '';

    // Check or create event in database
    $eventStmt = $pdo->prepare("SELECT id FROM events WHERE wedding_id = ? AND (drive_folder_id = ? OR name = ?) LIMIT 1");
    $eventStmt->execute([$weddingId, $folderId, $eventName]);
    $eventRow = $eventStmt->fetch();

    if ($eventRow) {
        $eventId = (int)$eventRow['id'];
        $upStmt = $pdo->prepare("UPDATE events SET drive_folder_id = ?, parent_folder_id = ?, updated_at = ? WHERE id = ?");
        $upStmt->execute([$folderId, $parentFolderId, date('Y-m-d H:i:s'), $eventId]);
    } else {
        $insStmt = $pdo->prepare("INSERT INTO events (wedding_id, drive_folder_id, parent_folder_id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)");
        $now = date('Y-m-d H:i:s');
        $insStmt->execute([$weddingId, $folderId, $parentFolderId, $eventName, $now, $now]);
        $eventId = (int)$pdo->lastInsertId();
        $stats['events']++;
    }

    do {
        $res = driveListFiles($folderId, $accessToken, $pageToken, $apiKey);
        $files = $res['files'] ?? [];
        $pageToken = $res['nextPageToken'] ?? '';

        foreach ($files as $file) {
            $isFolder = ($file['mimeType'] ?? '') === 'application/vnd.google-apps.folder';
            $name = $file['name'] ?? 'Untitled';

            if ($isFolder) {
                // Recursive subfolder event scan
                $subStats = scanFolderRecursive($pdo, $weddingId, $file['id'], $folderId, $name, $accessToken, $apiKey, $visitedFolders);
                $stats['events'] += $subStats['events'];
                $stats['videos'] += $subStats['videos'];
            } else {
                if (isVideoFile($file['mimeType'] ?? '', $name)) {
                    $meta = $file['videoMediaMetadata'] ?? [];
                    $duration = isset($meta['durationMillis']) ? (int)round($meta['durationMillis'] / 1000) : null;
                    $width = isset($meta['width']) ? (int)$meta['width'] : null;
                    $height = isset($meta['height']) ? (int)$meta['height'] : null;
                    $thumb = $file['thumbnailLink'] ?? ("https://drive.google.com/thumbnail?id={$file['id']}&sz=w1280");
                    $webView = $file['webViewLink'] ?? ("https://drive.google.com/file/d/{$file['id']}/view");
                    $fileSize = (int)($file['size'] ?? 0);
                    $now = date('Y-m-d H:i:s');

                    // Upsert video record
                    $vCheck = $pdo->prepare("SELECT id FROM videos WHERE drive_file_id = ? LIMIT 1");
                    $vCheck->execute([$file['id']]);
                    $vRow = $vCheck->fetch();

                    if ($vRow) {
                        $vUp = $pdo->prepare("UPDATE videos SET wedding_id = ?, event_id = ?, drive_folder_id = ?, name = ?, mime_type = ?, file_size = ?, duration_seconds = ?, width = ?, height = ?, thumbnail_url = ?, web_view_url = ?, modified_time = ?, updated_at = ? WHERE id = ?");
                        $vUp->execute([$weddingId, $eventId, $folderId, $name, $file['mimeType'] ?? 'video/mp4', $fileSize, $duration, $width, $height, $thumb, $webView, $file['modifiedTime'] ?? null, $now, $vRow['id']]);
                    } else {
                        $vIns = $pdo->prepare("INSERT INTO videos (wedding_id, event_id, drive_file_id, drive_folder_id, name, mime_type, file_size, duration_seconds, width, height, thumbnail_url, web_view_url, created_time, modified_time, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?)");
                        $vIns->execute([$weddingId, $eventId, $file['id'], $folderId, $name, $file['mimeType'] ?? 'video/mp4', $fileSize, $duration, $width, $height, $thumb, $webView, $file['createdTime'] ?? null, $file['modifiedTime'] ?? null, $now, $now]);
                    }
                    $stats['videos']++;
                }
            }
        }
    } while (!empty($pageToken));

    return $stats;
}

function scanDriveFolder(PDO $pdo, int $weddingId): array {
    $wStmt = $pdo->prepare("SELECT * FROM weddings WHERE id = ? LIMIT 1");
    $wStmt->execute([$weddingId]);
    $wedding = $wStmt->fetch();

    if (!$wedding) {
        throw new InvalidArgumentException("Wedding project not found.");
    }

    $folderId = $wedding['drive_folder_id'];
    if (empty($folderId)) {
        $folderId = extractGoogleDriveFolderId($wedding['drive_folder_url'] ?? '');
        if (!$folderId) {
            throw new InvalidArgumentException("Please provide a valid Google Drive folder link or Folder ID.");
        }
        $up = $pdo->prepare("UPDATE weddings SET drive_folder_id = ? WHERE id = ?");
        $up->execute([$folderId, $weddingId]);
    }

    $accessToken = getValidGoogleAccessToken((int)$wedding['user_id'], $pdo);
    $apiKey = GOOGLE_API_KEY;

    $visited = [];
    $stats = scanFolderRecursive($pdo, $weddingId, $folderId, null, 'Main Highlights', $accessToken, $apiKey, $visited);

    // Count actual total ready videos
    $cStmt = $pdo->prepare("SELECT COUNT(*) as total FROM videos WHERE wedding_id = ?");
    $cStmt->execute([$weddingId]);
    $totalCount = (int)$cStmt->fetch()['total'];

    $wUp = $pdo->prepare("UPDATE weddings SET total_videos = ?, last_scanned_at = ?, updated_at = ? WHERE id = ?");
    $now = date('Y-m-d H:i:s');
    $wUp->execute([$totalCount, $now, $now, $weddingId]);

    return [
        'wedding_id' => $weddingId,
        'events_count' => $stats['events'],
        'total_videos' => $totalCount,
    ];
}

// ============================================================================
// 5. HIGH-DEFINITION VIDEO STREAMING (HTTP 206 PARTIAL CONTENT)
// ============================================================================

function streamGoogleDriveVideo(PDO $pdo, int $videoId): void {
    $vStmt = $pdo->prepare("SELECT * FROM videos WHERE id = ? LIMIT 1");
    $vStmt->execute([$videoId]);
    $video = $vStmt->fetch();

    if (!$video) {
        http_response_code(404);
        echo "Video not found.";
        exit;
    }

    $weddingId = (int)$video['wedding_id'];
    $wStmt = $pdo->prepare("SELECT * FROM weddings WHERE id = ? LIMIT 1");
    $wStmt->execute([$weddingId]);
    $wedding = $wStmt->fetch();

    if (!$wedding) {
        http_response_code(404);
        echo "Wedding project not found.";
        exit;
    }

    // Security Check: Authorized Photographer OR Valid Client Gallery Session
    $isAuthorized = false;
    if (!empty($_SESSION['admin_user_id']) && (int)$_SESSION['admin_user_id'] === (int)$wedding['user_id']) {
        $isAuthorized = true;
    } else {
        $gStmt = $pdo->prepare("SELECT * FROM client_galleries WHERE wedding_id = ? AND status = 'active' LIMIT 1");
        $gStmt->execute([$weddingId]);
        $gallery = $gStmt->fetch();

        if ($gallery) {
            if (empty($gallery['password_enabled'])) {
                $isAuthorized = true;
            } else {
                $isAuthorized = !empty($_SESSION["gallery_unlocked_{$gallery['id']}"]);
            }
        }
    }

    if (!$isAuthorized) {
        http_response_code(403);
        echo "Access denied to video stream.";
        exit;
    }

    $driveFileId = $video['drive_file_id'];
    $accessToken = getValidGoogleAccessToken((int)$wedding['user_id'], $pdo);

    // Direct Google Drive download/stream endpoint
    $upstreamUrl = "https://drive.usercontent.google.com/download?id={$driveFileId}&export=download&authuser=0&confirm=t";

    // Setup cURL request with HTTP Range forwarding
    $ch = curl_init($upstreamUrl);

    $headers = [
        'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    ];

    if (!empty($accessToken)) {
        $headers[] = 'Authorization: Bearer ' . $accessToken;
    }

    $clientRange = $_SERVER['HTTP_RANGE'] ?? null;
    if (!empty($clientRange)) {
        $headers[] = 'Range: ' . $clientRange;
    }

    // Clean output buffers to prevent memory bloating
    while (ob_get_level() > 0) {
        ob_end_clean();
    }

    header('Accept-Ranges: bytes');

    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_RETURNTRANSFER => false,
        CURLOPT_HEADERFUNCTION => function ($curl, $header) {
            $len = strlen($header);
            $trimmed = trim($header);
            if (empty($trimmed)) return $len;

            if (preg_match('#^HTTP/[\d\.]+\s+(\d+)#i', $trimmed, $m)) {
                http_response_code((int)$m[1]);
                return $len;
            }

            $allowed = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control', 'last-modified', 'etag'];
            $parts = explode(':', $trimmed, 2);
            if (count($parts) === 2) {
                $hName = strtolower(trim($parts[0]));
                if (in_array($hName, $allowed, true)) {
                    header("{$parts[0]}: " . trim($parts[1]));
                }
            }
            return $len;
        },
        CURLOPT_WRITEFUNCTION => function ($curl, $data) {
            echo $data;
            flush();
            return strlen($data);
        },
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => 0,
        CURLOPT_BUFFERSIZE => 262144, // 256KB chunk stream
    ]);

    curl_exec($ch);
    curl_close($ch);
    exit;
}

// ============================================================================
// 6. ROUTER & ACTION HANDLER
// ============================================================================

$action = $_GET['action'] ?? 'home';
$pdo = getDb();

// ----------------------------------------------------------------------------
// Public & Client Endpoints
// ----------------------------------------------------------------------------

if ($action === 'home') {
    if (!empty($_SESSION['admin_user_id'])) {
        redirect('index.php?action=dashboard');
    }
    // Check if any admin exists
    $uCount = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    if ($uCount === 0) {
        redirect('index.php?action=install');
    }
    redirect('index.php?action=login');
}

// Installation / First Photographer Account
if ($action === 'install') {
    $uCount = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    if ($uCount > 0) {
        redirect('index.php?action=login');
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
            die('CSRF token validation failed.');
        }

        $name = trim($_POST['name'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        $studioName = trim($_POST['studio_name'] ?? 'Wedding Cinema');

        if (empty($name) || empty($email) || empty($password)) {
            $error = 'All fields are required.';
        } else {
            $hash = password_hash($password, PASSWORD_BCRYPT);
            $now = date('Y-m-d H:i:s');
            $stmt = $pdo->prepare("INSERT INTO users (name, email, password_hash, studio_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$name, $email, $hash, $studioName, $now, $now]);
            $userId = (int)$pdo->lastInsertId();

            // Set default settings
            $sStmt = $pdo->prepare("INSERT INTO gallery_settings (user_id, setting_key, setting_value, created_at, updated_at) VALUES (?, ?, ?, ?, ?)");
            $sStmt->execute([$userId, 'studio_name', $studioName, $now, $now]);
            $sStmt->execute([$userId, 'primary_color', '#D4AF37', $now, $now]);

            $_SESSION['admin_user_id'] = $userId;
            $_SESSION['admin_user_name'] = $name;
            setFlash('success', 'Photographer account created! Welcome to Wedding Video Gallery.');
            redirect('index.php?action=dashboard');
        }
    }

    renderInstallPage($error ?? null);
    exit;
}

// Photographer Login
if ($action === 'login') {
    if (!empty($_SESSION['admin_user_id'])) {
        redirect('index.php?action=dashboard');
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
            die('CSRF token validation failed.');
        }

        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';

        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            $_SESSION['admin_user_id'] = (int)$user['id'];
            $_SESSION['admin_user_name'] = $user['name'];
            setFlash('success', "Welcome back, {$user['name']}!");
            redirect('index.php?action=dashboard');
        } else {
            $error = 'Invalid email or password.';
        }
    }

    renderLoginPage($error ?? null);
    exit;
}

// Photographer Logout
if ($action === 'logout') {
    unset($_SESSION['admin_user_id'], $_SESSION['admin_user_name']);
    session_destroy();
    redirect('index.php?action=login');
}

// Client Gallery View
if ($action === 'gallery') {
    $token = $_GET['token'] ?? '';
    if (empty($token)) {
        render404('Invalid or missing gallery link token.');
        exit;
    }

    $stmt = $pdo->prepare("SELECT * FROM client_galleries WHERE gallery_code = ? AND status = 'active' LIMIT 1");
    $stmt->execute([$token]);
    $gallery = $stmt->fetch();

    if (!$gallery) {
        render404('Wedding film gallery not found or access has expired.');
        exit;
    }

    $weddingId = (int)$gallery['wedding_id'];
    $wStmt = $pdo->prepare("SELECT * FROM weddings WHERE id = ? LIMIT 1");
    $wStmt->execute([$weddingId]);
    $wedding = $wStmt->fetch();

    if (!$wedding) {
        render404('Wedding project data not found.');
        exit;
    }

    // Password Gate Check
    if (!empty($gallery['password_enabled'])) {
        $isUnlocked = !empty($_SESSION["gallery_unlocked_{$gallery['id']}"]);
        if (!$isUnlocked) {
            // Handle Password Submit
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
                    die('CSRF token error.');
                }
                $entered = $_POST['password'] ?? '';
                if (password_verify($entered, $gallery['password_hash'] ?? '')) {
                    $_SESSION["gallery_unlocked_{$gallery['id']}"] = true;
                    redirect("index.php?action=gallery&token=" . urlencode($token));
                } else {
                    $passError = 'Incorrect password. Please try again.';
                }
            }

            renderPasswordGate($wedding, $gallery, $passError ?? null);
            exit;
        }
    }

    // Log view session
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $now = date('Y-m-d H:i:s');
    $logStmt = $pdo->prepare("INSERT INTO client_sessions (gallery_id, ip_address, user_agent, last_active_at, created_at) VALUES (?, ?, ?, ?, ?)");
    $logStmt->execute([$gallery['id'], $ip, $ua, $now, $now]);

    // Fetch Events & Videos
    $eventsStmt = $pdo->prepare("SELECT * FROM events WHERE wedding_id = ? ORDER BY sort_order ASC, name ASC");
    $eventsStmt->execute([$weddingId]);
    $events = $eventsStmt->fetchAll();

    $videosStmt = $pdo->prepare("SELECT * FROM videos WHERE wedding_id = ? ORDER BY event_id ASC, sort_order ASC, name ASC");
    $videosStmt->execute([$weddingId]);
    $videos = $videosStmt->fetchAll();

    // Studio Settings
    $sStmt = $pdo->prepare("SELECT setting_key, setting_value FROM gallery_settings WHERE user_id = ?");
    $sStmt->execute([(int)$wedding['user_id']]);
    $settingsRaw = $sStmt->fetchAll();
    $settings = [];
    foreach ($settingsRaw as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }

    renderClientGallery($wedding, $gallery, $events, $videos, $settings);
    exit;
}

// Video Stream Proxy Endpoint
if ($action === 'stream') {
    $videoId = isset($_GET['video']) ? (int)$_GET['video'] : 0;
    streamGoogleDriveVideo($pdo, $videoId);
    exit;
}

// ----------------------------------------------------------------------------
// Photographer Admin Area (Requires Authentication)
// ----------------------------------------------------------------------------

function requireAdminAuth(): int {
    if (empty($_SESSION['admin_user_id'])) {
        redirect('index.php?action=login');
    }
    return (int)$_SESSION['admin_user_id'];
}

// Google OAuth Login Action
if ($action === 'google_login') {
    $userId = requireAdminAuth();
    $state = bin2hex(random_bytes(16)) . ':' . $userId;
    $_SESSION['oauth_state'] = $state;
    redirect(getGoogleAuthUrl($state));
}

// Google OAuth Callback Action
if ($action === 'google_callback') {
    $userId = requireAdminAuth();
    $code = $_GET['code'] ?? '';
    $state = $_GET['state'] ?? '';
    $savedState = $_SESSION['oauth_state'] ?? '';

    if (empty($code) || $state !== $savedState) {
        setFlash('error', 'Google OAuth authorization state mismatch or invalid code.');
        redirect('index.php?action=dashboard');
    }

    try {
        $tokens = exchangeGoogleAuthCode($code);
        $accessToken = $tokens['access_token'] ?? '';
        $refreshToken = $tokens['refresh_token'] ?? '';
        $expiresIn = $tokens['expires_in'] ?? 3600;
        $expiresAt = date('Y-m-d H:i:s', time() + $expiresIn);

        $now = date('Y-m-d H:i:s');
        $cStmt = $pdo->prepare("SELECT id, refresh_token FROM drive_connections WHERE user_id = ? LIMIT 1");
        $cStmt->execute([$userId]);
        $existing = $cStmt->fetch();

        $encryptedRefresh = !empty($refreshToken) ? encryptSecret($refreshToken) : ($existing['refresh_token'] ?? null);

        if ($existing) {
            $uStmt = $pdo->prepare("UPDATE drive_connections SET access_token = ?, refresh_token = ?, token_expires_at = ?, status = 'connected', updated_at = ? WHERE id = ?");
            $uStmt->execute([$accessToken, $encryptedRefresh, $expiresAt, $now, $existing['id']]);
        } else {
            $iStmt = $pdo->prepare("INSERT INTO drive_connections (user_id, access_token, refresh_token, token_expires_at, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'connected', ?, ?)");
            $iStmt->execute([$userId, $accessToken, $encryptedRefresh, $expiresAt, $now, $now]);
        }

        setFlash('success', 'Google Drive connected successfully via OAuth 2.0!');
    } catch (Throwable $e) {
        logMessage("OAuth callback error: " . $e->getMessage(), "ERROR");
        setFlash('error', 'Failed to connect Google Drive: ' . $e->getMessage());
    }

    redirect('index.php?action=dashboard');
}

// Photographer Dashboard
if ($action === 'dashboard') {
    $userId = requireAdminAuth();

    $wStmt = $pdo->prepare("SELECT w.*, g.gallery_code, g.password_enabled, (SELECT COUNT(*) FROM events e WHERE e.wedding_id = w.id) as events_count FROM weddings w LEFT JOIN client_galleries g ON g.wedding_id = w.id WHERE w.user_id = ? ORDER BY w.id DESC");
    $wStmt->execute([$userId]);
    $weddings = $wStmt->fetchAll();

    $vTotal = (int)$pdo->prepare("SELECT COUNT(*) FROM videos v JOIN weddings w ON v.wedding_id = w.id WHERE w.user_id = ?");
    $vTotalStmt = $pdo->prepare("SELECT COUNT(*) FROM videos v JOIN weddings w ON v.wedding_id = w.id WHERE w.user_id = ?");
    $vTotalStmt->execute([$userId]);
    $totalVideos = (int)$vTotalStmt->fetchColumn();

    $connStmt = $pdo->prepare("SELECT * FROM drive_connections WHERE user_id = ? LIMIT 1");
    $connStmt->execute([$userId]);
    $driveConn = $connStmt->fetch();

    renderDashboard($weddings, $totalVideos, $driveConn);
    exit;
}

// Create New Wedding Project
if ($action === 'new_wedding') {
    $userId = requireAdminAuth();

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
            die('CSRF validation failed.');
        }

        $coupleName = trim($_POST['couple_name'] ?? '');
        $weddingDate = !empty($_POST['wedding_date']) ? $_POST['wedding_date'] : null;
        $packageName = trim($_POST['package_name'] ?? 'Full Wedding Cinema');
        $coverImage = trim($_POST['cover_image'] ?? '');
        $welcomeMessage = trim($_POST['welcome_message'] ?? '');
        $driveUrl = trim($_POST['drive_folder_url'] ?? '');
        $folderId = extractGoogleDriveFolderId($driveUrl);

        $passwordEnabled = !empty($_POST['password_enabled']) ? 1 : 0;
        $rawPassword = $_POST['gallery_password'] ?? '';
        $allowDownload = !empty($_POST['allow_download']) ? 1 : 0;
        $allowFullscreen = !empty($_POST['allow_fullscreen']) ? 1 : 1;
        $showBranding = !empty($_POST['show_branding']) ? 1 : 1;

        if (empty($coupleName)) {
            $error = 'Couple Name is required.';
        } else {
            $now = date('Y-m-d H:i:s');
            $wStmt = $pdo->prepare("INSERT INTO weddings (user_id, couple_name, wedding_date, package_name, cover_image, welcome_message, drive_folder_id, drive_folder_url, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)");
            $wStmt->execute([$userId, $coupleName, $weddingDate, $packageName, $coverImage, $welcomeMessage, $folderId, $driveUrl, $now, $now]);
            $weddingId = (int)$pdo->lastInsertId();

            // Generate cryptographically secure gallery token
            $galleryToken = bin2hex(random_bytes(16));
            $passHash = ($passwordEnabled && !empty($rawPassword)) ? password_hash($rawPassword, PASSWORD_BCRYPT) : null;

            $gStmt = $pdo->prepare("INSERT INTO client_galleries (wedding_id, gallery_code, password_hash, password_enabled, allow_download, allow_fullscreen, show_branding, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)");
            $gStmt->execute([$weddingId, $galleryToken, $passHash, $passwordEnabled, $allowDownload, $allowFullscreen, $showBranding, $now, $now]);

            // Auto-scan if folder link provided
            if ($folderId) {
                try {
                    $res = scanDriveFolder($pdo, $weddingId);
                    setFlash('success', "Wedding project created! Scanned {$res['total_videos']} videos across {$res['events_count']} event folders.");
                } catch (Throwable $e) {
                    setFlash('warning', "Wedding created, but initial Google Drive scan encountered an issue: " . $e->getMessage());
                }
            } else {
                setFlash('success', 'Wedding project created! Connect a Google Drive folder to import videos.');
            }

            redirect("index.php?action=videos&id={$weddingId}");
        }
    }

    renderNewWeddingPage($error ?? null);
    exit;
}

// Edit Wedding Project
if ($action === 'edit_wedding') {
    $userId = requireAdminAuth();
    $weddingId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    $wStmt = $pdo->prepare("SELECT * FROM weddings WHERE id = ? AND user_id = ? LIMIT 1");
    $wStmt->execute([$weddingId, $userId]);
    $wedding = $wStmt->fetch();

    if (!$wedding) {
        setFlash('error', 'Wedding project not found.');
        redirect('index.php?action=dashboard');
    }

    $gStmt = $pdo->prepare("SELECT * FROM client_galleries WHERE wedding_id = ? LIMIT 1");
    $gStmt->execute([$weddingId]);
    $gallery = $gStmt->fetch();

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
            die('CSRF validation failed.');
        }

        $coupleName = trim($_POST['couple_name'] ?? '');
        $weddingDate = !empty($_POST['wedding_date']) ? $_POST['wedding_date'] : null;
        $packageName = trim($_POST['package_name'] ?? '');
        $coverImage = trim($_POST['cover_image'] ?? '');
        $welcomeMessage = trim($_POST['welcome_message'] ?? '');
        $driveUrl = trim($_POST['drive_folder_url'] ?? '');
        $folderId = extractGoogleDriveFolderId($driveUrl);

        $passwordEnabled = !empty($_POST['password_enabled']) ? 1 : 0;
        $rawPassword = $_POST['gallery_password'] ?? '';
        $allowDownload = !empty($_POST['allow_download']) ? 1 : 0;

        if (empty($coupleName)) {
            $error = 'Couple Name is required.';
        } else {
            $now = date('Y-m-d H:i:s');
            $upW = $pdo->prepare("UPDATE weddings SET couple_name = ?, wedding_date = ?, package_name = ?, cover_image = ?, welcome_message = ?, drive_folder_id = ?, drive_folder_url = ?, updated_at = ? WHERE id = ?");
            $upW->execute([$coupleName, $weddingDate, $packageName, $coverImage, $welcomeMessage, $folderId, $driveUrl, $now, $weddingId]);

            if ($gallery) {
                $passHash = $gallery['password_hash'];
                if ($passwordEnabled && !empty($rawPassword)) {
                    $passHash = password_hash($rawPassword, PASSWORD_BCRYPT);
                } elseif (!$passwordEnabled) {
                    $passHash = null;
                }
                $upG = $pdo->prepare("UPDATE client_galleries SET password_hash = ?, password_enabled = ?, allow_download = ?, updated_at = ? WHERE id = ?");
                $upG->execute([$passHash, $passwordEnabled, $allowDownload, $now, $gallery['id']]);
            }

            setFlash('success', 'Wedding details updated successfully.');
            redirect("index.php?action=videos&id={$weddingId}");
        }
    }

    renderEditWeddingPage($wedding, $gallery, $error ?? null);
    exit;
}

// Wedding Details & Videos View
if ($action === 'videos') {
    $userId = requireAdminAuth();
    $weddingId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    $wStmt = $pdo->prepare("SELECT * FROM weddings WHERE id = ? AND user_id = ? LIMIT 1");
    $wStmt->execute([$weddingId, $userId]);
    $wedding = $wStmt->fetch();

    if (!$wedding) {
        setFlash('error', 'Wedding project not found.');
        redirect('index.php?action=dashboard');
    }

    $gStmt = $pdo->prepare("SELECT * FROM client_galleries WHERE wedding_id = ? LIMIT 1");
    $gStmt->execute([$weddingId]);
    $gallery = $gStmt->fetch();

    $eventsStmt = $pdo->prepare("SELECT * FROM events WHERE wedding_id = ? ORDER BY sort_order ASC, name ASC");
    $eventsStmt->execute([$weddingId]);
    $events = $eventsStmt->fetchAll();

    $videosStmt = $pdo->prepare("SELECT * FROM videos WHERE wedding_id = ? ORDER BY event_id ASC, sort_order ASC, name ASC");
    $videosStmt->execute([$weddingId]);
    $videos = $videosStmt->fetchAll();

    renderWeddingVideosPage($wedding, $gallery, $events, $videos);
    exit;
}

// Trigger Google Drive Scan
if ($action === 'scan') {
    $userId = requireAdminAuth();
    $weddingId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    $wStmt = $pdo->prepare("SELECT * FROM weddings WHERE id = ? AND user_id = ? LIMIT 1");
    $wStmt->execute([$weddingId, $userId]);
    $wedding = $wStmt->fetch();

    if (!$wedding) {
        setFlash('error', 'Wedding project not found.');
        redirect('index.php?action=dashboard');
    }

    try {
        $result = scanDriveFolder($pdo, $weddingId);
        setFlash('success', "Google Drive scan complete! Synced {$result['total_videos']} videos across {$result['events_count']} event folders.");
    } catch (Throwable $e) {
        logMessage("Manual scan error: " . $e->getMessage(), "ERROR");
        setFlash('error', "Scan error: " . $e->getMessage());
    }

    redirect("index.php?action=videos&id={$weddingId}");
}

// Studio Settings
if ($action === 'settings') {
    $userId = requireAdminAuth();

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
            die('CSRF validation failed.');
        }

        $studioName = trim($_POST['studio_name'] ?? '');
        $primaryColor = trim($_POST['primary_color'] ?? '#D4AF37');
        $logoUrl = trim($_POST['logo_url'] ?? '');
        $website = trim($_POST['website'] ?? '');
        $instagram = trim($_POST['instagram'] ?? '');
        $whatsapp = trim($_POST['whatsapp'] ?? '');
        $footerText = trim($_POST['footer_text'] ?? '');

        $settings = [
            'studio_name' => $studioName,
            'primary_color' => $primaryColor,
            'logo_url' => $logoUrl,
            'website' => $website,
            'instagram' => $instagram,
            'whatsapp' => $whatsapp,
            'footer_text' => $footerText,
        ];

        $now = date('Y-m-d H:i:s');
        foreach ($settings as $key => $val) {
            $chk = $pdo->prepare("SELECT id FROM gallery_settings WHERE user_id = ? AND setting_key = ? LIMIT 1");
            $chk->execute([$userId, $key]);
            if ($chk->fetch()) {
                $up = $pdo->prepare("UPDATE gallery_settings SET setting_value = ?, updated_at = ? WHERE user_id = ? AND setting_key = ?");
                $up->execute([$val, $now, $userId, $key]);
            } else {
                $ins = $pdo->prepare("INSERT INTO gallery_settings (user_id, setting_key, setting_value, created_at, updated_at) VALUES (?, ?, ?, ?, ?)");
                $ins->execute([$userId, $key, $val, $now, $now]);
            }
        }

        setFlash('success', 'Studio branding settings updated.');
        redirect('index.php?action=settings');
    }

    $sStmt = $pdo->prepare("SELECT setting_key, setting_value FROM gallery_settings WHERE user_id = ?");
    $sStmt->execute([$userId]);
    $raw = $sStmt->fetchAll();
    $settings = [];
    foreach ($raw as $r) {
        $settings[$r['setting_key']] = $r['setting_value'];
    }

    renderSettingsPage($settings);
    exit;
}

// AJAX API: Rescan Folder
if ($action === 'api_scan') {
    $userId = requireAdminAuth();
    $weddingId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    try {
        $res = scanDriveFolder($pdo, $weddingId);
        jsonResponse([
            'success' => true,
            'message' => "Successfully detected {$res['total_videos']} videos across {$res['events_count']} event folders",
            'videos' => $res['total_videos'],
            'events' => $res['events_count'],
        ]);
    } catch (Throwable $e) {
        jsonResponse([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
}

// Fallback 404
render404('Page not found.');
exit;

// ============================================================================
// 7. EMBEDDED HTML TEMPLATES & VIEWS
// ============================================================================

function renderLayout(string $title, string $content, bool $isAdmin = false): void {
    $csrf = generateCsrfToken();
    $success = getFlash('success');
    $warning = getFlash('warning');
    $error = getFlash('error');
    $userName = $_SESSION['admin_user_name'] ?? 'Photographer';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e($title) ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        /* ==========================================================================
           WEDDING VIDEO GALLERY — LUXURY DESIGN SYSTEM
           ========================================================================== */
        :root {
            --bg-main: #0B0B0E;
            --bg-card: #141418;
            --bg-card-hover: #1A1A22;
            --bg-input: #1C1C24;
            --border-color: rgba(255, 255, 255, 0.08);
            --border-gold: rgba(212, 175, 55, 0.35);
            --gold-primary: #D4AF37;
            --gold-light: #F3E5AB;
            --gold-dark: #AA820A;
            --gold-gradient: linear-gradient(135deg, #ECC94B 0%, #D4AF37 50%, #B78727 100%);
            --text-main: #F4F4F6;
            --text-muted: #9CA3AF;
            --text-dim: #6B7280;
            --success: #10B981;
            --warning: #F59E0B;
            --danger: #EF4444;
            --font-heading: 'Cormorant Garamond', Georgia, serif;
            --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            --radius-sm: 6px;
            --radius-md: 10px;
            --radius-lg: 16px;
            --radius-full: 9999px;
            --shadow-card: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
            --shadow-gold: 0 0 25px rgba(212, 175, 55, 0.2);
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background-color: var(--bg-main);
            color: var(--text-main);
            font-family: var(--font-sans);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            min-height: 100vh;
        }
        a { color: var(--gold-primary); text-decoration: none; transition: color 0.2s ease; }
        a:hover { color: var(--gold-light); }
        .container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
        h1, h2, h3, h4, h5 { font-family: var(--font-heading); letter-spacing: 0.02em; font-weight: 600; }
        .page-title { font-size: 2.25rem; color: var(--text-main); }
        .page-subtitle { color: var(--text-muted); font-size: 0.95rem; margin-top: 4px; }
        
        /* Admin Navigation */
        .admin-nav {
            background-color: rgba(20, 20, 24, 0.85);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--border-color);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .nav-container {
            max-width: 1240px;
            margin: 0 auto;
            padding: 16px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .brand-link {
            display: flex;
            align-items: center;
            gap: 10px;
            color: var(--text-main);
            font-family: var(--font-heading);
            font-size: 1.35rem;
            font-weight: 700;
        }
        .brand-badge {
            background: var(--gold-gradient);
            color: #000;
            font-family: var(--font-sans);
            font-size: 0.65rem;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: var(--radius-sm);
        }
        .nav-links { display: flex; align-items: center; gap: 20px; }
        .nav-item {
            color: var(--text-muted);
            font-size: 0.9rem;
            font-weight: 500;
            padding: 6px 12px;
            border-radius: var(--radius-sm);
        }
        .nav-item:hover, .nav-item.active {
            color: var(--gold-light);
            background: rgba(212, 175, 55, 0.08);
        }
        .nav-user {
            display: flex;
            align-items: center;
            gap: 12px;
            padding-left: 16px;
            border-left: 1px solid var(--border-color);
        }
        .user-email { font-size: 0.85rem; color: var(--text-muted); }
        
        /* Main Layout */
        .admin-main { padding: 36px 0 60px; }
        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 28px;
        }

        /* Buttons */
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-family: var(--font-sans);
            font-size: 0.9rem;
            font-weight: 600;
            padding: 10px 20px;
            border-radius: var(--radius-sm);
            border: 1px solid transparent;
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: center;
        }
        .btn-primary {
            background: var(--gold-gradient);
            color: #0B0B0E;
            box-shadow: 0 4px 14px rgba(212, 175, 55, 0.25);
        }
        .btn-primary:hover { filter: brightness(1.1); color: #000; box-shadow: 0 6px 20px rgba(212, 175, 55, 0.4); }
        .btn-outline { background: transparent; color: var(--text-main); border-color: var(--border-color); }
        .btn-outline:hover { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.2); }
        .btn-outline-gold { background: transparent; color: var(--gold-primary); border-color: var(--border-gold); }
        .btn-outline-gold:hover { background: rgba(212, 175, 55, 0.1); color: var(--gold-light); }
        .btn-sm { padding: 6px 14px; font-size: 0.8rem; }
        .btn-xs { padding: 4px 10px; font-size: 0.75rem; }
        .btn-block { display: block; width: 100%; }

        /* Stats Cards */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 20px;
            margin-bottom: 32px;
        }
        .stat-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 20px;
        }
        .stat-label { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .stat-value { font-size: 2rem; font-weight: 700; color: var(--gold-light); margin-top: 4px; font-family: var(--font-heading); }
        .stat-status { display: flex; align-items: center; gap: 10px; margin-top: 8px; }

        /* Content Cards & Tables */
        .content-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 24px;
            box-shadow: var(--shadow-card);
        }
        .card-header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .card-title { font-size: 1.5rem; color: var(--text-main); }
        .table-responsive { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
        .data-table th {
            text-align: left;
            padding: 12px 16px;
            color: var(--text-muted);
            border-bottom: 1px solid var(--border-color);
            font-size: 0.8rem;
            text-transform: uppercase;
        }
        .data-table td { padding: 16px; border-bottom: 1px solid var(--border-color); color: var(--text-main); }
        .data-table tbody tr:hover { background: rgba(255, 255, 255, 0.02); }
        .text-right { text-align: right; }

        /* Badges & Alerts */
        .badge { display: inline-block; padding: 3px 8px; border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 600; }
        .badge-success { background: rgba(16, 185, 129, 0.15); color: #34D399; }
        .badge-warning { background: rgba(245, 158, 11, 0.15); color: #FBBF24; }
        .badge-gold { background: rgba(212, 175, 55, 0.15); color: var(--gold-light); border: 1px solid var(--border-gold); }
        .badge-muted { background: rgba(255, 255, 255, 0.08); color: var(--text-muted); }
        .alert { padding: 14px 18px; border-radius: var(--radius-sm); margin-bottom: 24px; font-size: 0.9rem; display: flex; align-items: center; gap: 12px; }
        .alert-success { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: #34D399; }
        .alert-warning { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); color: #FBBF24; }
        .alert-error { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #F87171; }

        /* Forms */
        .form-card-container { max-width: 720px; margin: 0 auto; }
        .form-section { margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid var(--border-color); }
        .section-title { font-size: 1.15rem; color: var(--gold-light); margin-bottom: 16px; }
        .form-group { margin-bottom: 18px; }
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-label { display: block; font-size: 0.85rem; font-weight: 500; color: var(--text-muted); margin-bottom: 6px; }
        .form-control {
            width: 100%;
            padding: 10px 14px;
            background: var(--bg-input);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-sm);
            color: var(--text-main);
            font-size: 0.9rem;
            font-family: var(--font-sans);
        }
        .form-control:focus { outline: none; border-color: var(--gold-primary); box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2); }
        .form-hint { display: block; font-size: 0.75rem; color: var(--text-dim); margin-top: 4px; }
        .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }

        /* Admin Project Show Details */
        .admin-details-grid { display: grid; grid-template-columns: 340px 1fr; gap: 28px; }
        @media (max-width: 900px) { .admin-details-grid { grid-template-columns: 1fr; } }
        .project-hero {
            background: linear-gradient(180deg, rgba(20, 20, 24, 0.9) 0%, rgba(11, 11, 14, 0.95) 100%);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 32px;
            margin-bottom: 28px;
        }
        .project-title { font-size: 2.5rem; color: var(--gold-light); }
        .share-box { display: flex; gap: 8px; margin-top: 8px; }
        .form-control-copy { flex: 1; padding: 8px 12px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-sm); color: var(--text-muted); font-size: 0.8rem; }
        .drive-info-box { background: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px; font-size: 0.85rem; }
        .drive-meta-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }

        /* Videos Grid & Cards */
        .event-section { margin-bottom: 32px; }
        .event-header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid var(--border-color); margin-bottom: 16px; }
        .event-name { font-size: 1.35rem; color: var(--gold-light); }
        .videos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
        .video-card { background: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; transition: all 0.25s ease; }
        .video-card:hover { transform: translateY(-3px); border-color: var(--border-gold); box-shadow: var(--shadow-gold); }
        .video-thumbnail-wrapper { position: relative; aspect-ratio: 16 / 9; background: #000; cursor: pointer; overflow: hidden; }
        .video-thumb { width: 100%; height: 100%; object-fit: cover; }
        .play-overlay { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.4); display: flex; align-items: center; justify-content: center; }
        .play-circle { width: 48px; height: 48px; background: var(--gold-gradient); color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; padding-left: 3px; }
        .duration-badge { position: absolute; bottom: 8px; right: 8px; background: rgba(0, 0, 0, 0.8); color: #fff; font-size: 0.75rem; padding: 2px 6px; border-radius: var(--radius-sm); }
        .video-info { padding: 12px 14px; }
        .video-title { font-size: 0.95rem; font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .video-meta { display: flex; gap: 8px; font-size: 0.75rem; color: var(--text-dim); margin-top: 4px; }

        /* ==========================================================================
           CLIENT CINEMA GALLERY
           ========================================================================== */
        .client-gallery-page { background: #08080A; min-height: 100vh; }
        .gallery-hero {
            min-height: 55vh;
            background-size: cover;
            background-position: center;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 80px 24px 60px;
            position: relative;
        }
        .gallery-hero-inner { max-width: 800px; }
        .studio-badge {
            display: inline-block;
            color: var(--gold-primary);
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            margin-bottom: 16px;
            padding: 4px 14px;
            border: 1px solid var(--border-gold);
            border-radius: var(--radius-full);
            background: rgba(0, 0, 0, 0.4);
        }
        .hero-pretitle { font-size: 0.85rem; letter-spacing: 0.25em; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; }
        .hero-couple-title {
            font-size: 4rem;
            font-weight: 400;
            line-height: 1.1;
            font-style: italic;
            background: linear-gradient(180deg, #FFFFFF 0%, #E2D9C8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        @media (max-width: 768px) { .hero-couple-title { font-size: 2.75rem; } }
        .hero-date-divider { display: flex; align-items: center; justify-content: center; gap: 16px; margin: 20px 0; }
        .divider-line { width: 60px; height: 1px; background: var(--border-gold); }
        .hero-date { font-family: var(--font-heading); font-size: 1.25rem; color: var(--gold-light); }
        .hero-tagline { color: var(--text-muted); font-size: 0.95rem; max-width: 540px; margin: 0 auto; }
        .gallery-container { max-width: 1280px; margin: -40px auto 60px; padding: 0 24px; position: relative; z-index: 10; }
        .gallery-tabs {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 40px;
            background: rgba(20, 20, 24, 0.8);
            backdrop-filter: blur(16px);
            padding: 8px;
            border-radius: var(--radius-full);
            border: 1px solid var(--border-color);
            max-width: fit-content;
            margin-left: auto;
            margin-right: auto;
        }
        .gallery-tab-btn {
            background: transparent;
            border: none;
            color: var(--text-muted);
            font-family: var(--font-sans);
            font-size: 0.85rem;
            font-weight: 500;
            padding: 8px 18px;
            border-radius: var(--radius-full);
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .gallery-tab-btn.active { background: var(--gold-gradient); color: #000; font-weight: 600; box-shadow: 0 2px 10px rgba(212, 175, 55, 0.3); }
        .client-event-section { margin-bottom: 48px; }
        .client-event-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); padding-bottom: 12px; }
        .client-event-title { font-size: 2rem; color: var(--gold-light); font-weight: 400; }
        .client-videos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 28px; }
        .client-video-card { background: #111115; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: var(--radius-lg); overflow: hidden; cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .client-video-card:hover { transform: translateY(-6px); border-color: var(--border-gold); box-shadow: 0 16px 36px -10px rgba(0, 0, 0, 0.7), var(--shadow-gold); }
        .client-thumb-wrap { position: relative; aspect-ratio: 16 / 9; background: #000; overflow: hidden; }
        .client-video-img { width: 100%; height: 100%; object-fit: cover; }
        .client-play-btn { width: 56px; height: 56px; background: var(--gold-gradient); color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; padding-left: 4px; }
        .client-duration { position: absolute; bottom: 10px; right: 10px; background: rgba(0, 0, 0, 0.85); color: #fff; font-size: 0.75rem; font-weight: 600; padding: 3px 8px; border-radius: var(--radius-sm); }
        .client-video-meta { padding: 16px 18px; }
        .client-video-title { font-size: 1.3rem; font-weight: 600; color: #fff; margin-bottom: 4px; }
        .client-gallery-footer { border-top: 1px solid var(--border-color); padding: 60px 24px; text-align: center; color: var(--text-dim); font-size: 0.85rem; }

        /* Cinema Video Modal Player */
        .video-modal-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.92); backdrop-filter: blur(16px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .video-modal-dialog { background: #101014; border: 1px solid var(--border-gold); border-radius: var(--radius-lg); width: 100%; max-width: 1040px; box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.9), var(--shadow-gold); overflow: hidden; }
        .video-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: #141418; border-bottom: 1px solid var(--border-color); }
        .modal-event-badge { font-size: 0.75rem; color: var(--gold-primary); text-transform: uppercase; letter-spacing: 0.1em; }
        .modal-video-title { font-size: 1.35rem; color: #fff; margin-top: 2px; }
        .modal-nav-info { font-size: 0.8rem; color: var(--text-muted); margin-left: 10px; }
        .modal-close-btn { background: transparent; border: none; color: var(--text-muted); font-size: 1.4rem; cursor: pointer; padding: 6px; }
        .modal-close-btn:hover { color: #fff; }
        .video-player-container { position: relative; background: #000; aspect-ratio: 16 / 9; }
        .cinema-video-element { width: 100%; height: 100%; display: block; outline: none; }
        .player-buffering-overlay { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.75); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: var(--gold-light); font-size: 0.9rem; }
        .spinner { width: 40px; height: 40px; border: 3px solid rgba(212, 175, 55, 0.2); border-top-color: var(--gold-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .modal-footer-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 24px;
            background: #141418;
            border-top: 1px solid var(--border-color);
        }

        /* Auth & Gate Wrappers */
        .auth-wrapper, .password-gate-wrapper, .error-page-wrapper { min-height: 90vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .auth-card, .password-gate-card, .error-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 40px; width: 100%; max-width: 460px; box-shadow: var(--shadow-card); text-align: center; }
        .brand-badge-large { font-size: 0.75rem; font-weight: 700; color: var(--gold-primary); letter-spacing: 0.2em; margin-bottom: 12px; }
        .auth-title, .gate-title { font-size: 2.2rem; margin-bottom: 8px; color: #fff; }
        .auth-subtitle, .gate-subtitle { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 28px; }
        .gate-icon { font-size: 2.5rem; margin-bottom: 12px; }
        .gate-input { text-align: center; font-size: 1.1rem; letter-spacing: 0.1em; padding: 12px; }
    </style>
</head>
<body class="<?= $isAdmin ? 'admin-body' : 'client-body' ?>">

    <?php if ($isAdmin && !empty($_SESSION['admin_user_id'])): ?>
    <header class="admin-nav">
        <div class="nav-container">
            <div class="nav-brand">
                <a href="index.php?action=dashboard" class="brand-link">
                    <span class="brand-badge">PRO</span>
                    <span class="brand-text"><?= e(APP_NAME) ?></span>
                </a>
            </div>
            <nav class="nav-links">
                <a href="index.php?action=dashboard" class="nav-item <?= ($_GET['action'] ?? '') === 'dashboard' ? 'active' : '' ?>">Dashboard</a>
                <a href="index.php?action=new_wedding" class="nav-item <?= ($_GET['action'] ?? '') === 'new_wedding' ? 'active' : '' ?>">+ New Wedding</a>
                <a href="index.php?action=settings" class="nav-item <?= ($_GET['action'] ?? '') === 'settings' ? 'active' : '' ?>">Settings</a>
                <div class="nav-user">
                    <span class="user-email"><?= e($userName) ?></span>
                    <a href="index.php?action=logout" class="btn btn-sm btn-outline">Logout</a>
                </div>
            </nav>
        </div>
    </header>
    <?php endif; ?>

    <main class="<?= $isAdmin ? 'admin-main' : '' ?>">
        <div class="<?= $isAdmin ? 'container' : '' ?>">
            <?php if ($success): ?>
                <div class="alert alert-success"><span>✓ <?= e($success) ?></span></div>
            <?php endif; ?>
            <?php if ($warning): ?>
                <div class="alert alert-warning"><span>⚠ <?= e($warning) ?></span></div>
            <?php endif; ?>
            <?php if ($error): ?>
                <div class="alert alert-error"><span>✕ <?= e($error) ?></span></div>
            <?php endif; ?>

            <?= $content ?>
        </div>
    </main>

    <!-- Embedded Video Player Modal -->
    <div id="videoModal" class="video-modal-backdrop" style="display: none;">
        <div class="video-modal-dialog">
            <div class="video-modal-header">
                <div>
                    <span id="modalEventName" class="modal-event-badge">Main Event</span>
                    <span id="modalVideoCounter" class="modal-nav-info">Video 1 of 1</span>
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
                    <p id="playerBufferingText">Loading video stream from Google Drive...</p>
                </div>
            </div>
            <div class="modal-footer-controls">
                <div>
                    <button class="btn btn-xs btn-outline" id="prevVideoBtn" onclick="playPreviousVideo()">← Previous</button>
                    <button class="btn btn-xs btn-outline" id="nextVideoBtn" onclick="playNextVideo()">Next →</button>
                </div>
                <div id="googleDriveFallbackLink" style="display:none;">
                    <a href="#" target="_blank" id="driveDirectLink" class="btn btn-xs btn-outline-gold">Open in Google Drive ↗</a>
                </div>
            </div>
        </div>
    </div>

    <!-- Embedded Vanilla JavaScript -->
    <script>
        let playlist = [];
        let currentVideoIndex = -1;

        function setPlaylist(items) {
            playlist = items || [];
        }

        function openVideoPlayerByIndex(index) {
            if (index < 0 || index >= playlist.length) return;
            currentVideoIndex = index;
            const item = playlist[index];
            openVideoPlayer(item.id, item.title, item.event, item.streamUrl, item.webViewUrl, index + 1, playlist.length);
        }

        function playPreviousVideo() {
            if (currentVideoIndex > 0) {
                openVideoPlayerByIndex(currentVideoIndex - 1);
            }
        }

        function playNextVideo() {
            if (currentVideoIndex < playlist.length - 1) {
                openVideoPlayerByIndex(currentVideoIndex + 1);
            }
        }

        function openVideoPlayer(videoId, title, eventName, streamUrl, webViewUrl = '', currentNum = 1, totalNum = 1) {
            const modal = document.getElementById('videoModal');
            const player = document.getElementById('cinemaPlayer');
            const source = document.getElementById('videoSource');
            const titleElem = document.getElementById('modalVideoTitle');
            const eventElem = document.getElementById('modalEventName');
            const counterElem = document.getElementById('modalVideoCounter');
            const bufferingOverlay = document.getElementById('playerBuffering');
            const bufferingText = document.getElementById('playerBufferingText');
            const prevBtn = document.getElementById('prevVideoBtn');
            const nextBtn = document.getElementById('nextVideoBtn');
            const fallbackDiv = document.getElementById('googleDriveFallbackLink');
            const driveLink = document.getElementById('driveDirectLink');

            if (!modal || !player || !source) return;

            titleElem.textContent = title || 'Wedding Film';
            eventElem.textContent = eventName || 'Main Event';
            if (counterElem) counterElem.textContent = `Video ${currentNum} of ${totalNum}`;

            if (prevBtn) prevBtn.disabled = (currentVideoIndex <= 0);
            if (nextBtn) nextBtn.disabled = (currentVideoIndex >= playlist.length - 1);

            if (webViewUrl && driveLink && fallbackDiv) {
                driveLink.href = webViewUrl;
                fallbackDiv.style.display = 'block';
            } else if (fallbackDiv) {
                fallbackDiv.style.display = 'none';
            }

            if (bufferingOverlay) {
                bufferingOverlay.style.display = 'flex';
                if (bufferingText) bufferingText.textContent = 'Loading video stream from Google Drive...';
            }

            source.src = streamUrl;
            player.load();

            player.oncanplay = function () {
                if (bufferingOverlay) bufferingOverlay.style.display = 'none';
                player.play().catch(e => console.log('Autoplay prevented:', e));
            };

            player.onwaiting = function () {
                if (bufferingOverlay) {
                    bufferingOverlay.style.display = 'flex';
                    if (bufferingText) bufferingText.textContent = 'Buffering stream...';
                }
            };

            player.onplaying = function () {
                if (bufferingOverlay) bufferingOverlay.style.display = 'none';
            };

            player.onerror = function () {
                if (bufferingOverlay) {
                    bufferingOverlay.innerHTML = `
                        <div style="color:#EF4444; font-size:1.5rem;">✕</div>
                        <p style="color:#EF4444;">Unable to play this video stream.</p>
                        <div style="display:flex; gap:10px; margin-top:8px;">
                            <button class="btn btn-xs btn-outline" onclick="openVideoPlayer(${videoId}, '${title}', '${eventName}', '${streamUrl}', '${webViewUrl}', ${currentNum}, ${totalNum})">Retry</button>
                            ${webViewUrl ? `<a href="${webViewUrl}" target="_blank" class="btn btn-xs btn-outline-gold">Open in Google Drive ↗</a>` : ''}
                        </div>
                    `;
                    bufferingOverlay.style.display = 'flex';
                }
            };

            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        function closeVideoPlayer() {
            const modal = document.getElementById('videoModal');
            const player = document.getElementById('cinemaPlayer');
            const source = document.getElementById('videoSource');

            if (player) {
                player.pause();
                if (source) source.src = '';
                player.load();
            }
            if (modal) modal.style.display = 'none';
            document.body.style.overflow = '';
        }

        // Close on ESC and Backdrop
        document.addEventListener('DOMContentLoaded', () => {
            const modal = document.getElementById('videoModal');
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) closeVideoPlayer();
                });
            }
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') closeVideoPlayer();
                if (e.key === 'ArrowRight' && modal && modal.style.display === 'flex') playNextVideo();
                if (e.key === 'ArrowLeft' && modal && modal.style.display === 'flex') playPreviousVideo();
            });
        });

        // Copy Client Link Helper
        function copyGalleryLink(id) {
            const input = document.getElementById(id);
            if (input) {
                navigator.clipboard.writeText(input.value);
                alert('Client gallery link copied to clipboard!');
            }
        }
    </script>
</body>
</html>
<?php
}

// ----------------------------------------------------------------------------
// Specific View Renderers
// ----------------------------------------------------------------------------

function renderInstallPage(?string $error): void {
    $csrf = generateCsrfToken();
    ob_start();
?>
<div class="auth-wrapper">
    <div class="auth-card">
        <div class="brand-badge-large">INITIAL SETUP</div>
        <h1 class="auth-title">Create Photographer Account</h1>
        <p class="auth-subtitle">Set up your studio login to connect Google Drive and deliver client films</p>

        <?php if ($error): ?>
            <div class="alert alert-error"><span><?= e($error) ?></span></div>
        <?php endif; ?>

        <form action="index.php?action=install" method="POST">
            <input type="hidden" name="csrf_token" value="<?= e($csrf) ?>">
            <div class="form-group">
                <label class="form-label">Photographer / Studio Name</label>
                <input type="text" name="name" class="form-control" placeholder="e.g. Alex Rivera" required autofocus>
            </div>
            <div class="form-group">
                <label class="form-label">Brand / Studio Title</label>
                <input type="text" name="studio_name" class="form-control" placeholder="e.g. DR Films Wedding Cinema" required>
            </div>
            <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" name="email" class="form-control" placeholder="photographer@studio.com" required>
            </div>
            <div class="form-group">
                <label class="form-label">Password</label>
                <input type="password" name="password" class="form-control" placeholder="••••••••" required>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Complete Setup & Launch Studio</button>
        </form>
    </div>
</div>
<?php
    $content = ob_get_clean();
    renderLayout('Installation | ' . APP_NAME, $content, false);
}

function renderLoginPage(?string $error): void {
    $csrf = generateCsrfToken();
    ob_start();
?>
<div class="auth-wrapper">
    <div class="auth-card">
        <div class="brand-badge-large">WEDDING CINEMA</div>
        <h1 class="auth-title">Photographer Sign In</h1>
        <p class="auth-subtitle">Deliver timeless wedding films directly from your Google Drive</p>

        <?php if ($error): ?>
            <div class="alert alert-error"><span><?= e($error) ?></span></div>
        <?php endif; ?>

        <form action="index.php?action=login" method="POST">
            <input type="hidden" name="csrf_token" value="<?= e($csrf) ?>">
            <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" name="email" class="form-control" placeholder="photographer@studio.com" required autofocus>
            </div>
            <div class="form-group">
                <label class="form-label">Password</label>
                <input type="password" name="password" class="form-control" placeholder="••••••••" required>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Sign In to Dashboard</button>
        </form>
    </div>
</div>
<?php
    $content = ob_get_clean();
    renderLayout('Sign In | ' . APP_NAME, $content, false);
}

function renderPasswordGate(array $wedding, array $gallery, ?string $error): void {
    $csrf = generateCsrfToken();
    ob_start();
?>
<div class="password-gate-wrapper">
    <div class="password-gate-card">
        <div class="gate-icon">🔒</div>
        <div class="brand-badge-large">PRIVATE WEDDING GALLERY</div>
        <h1 class="gate-title"><?= e($wedding['couple_name']) ?></h1>
        <p class="gate-subtitle">This wedding gallery is private. Please enter the password provided by the couple or studio to watch your wedding films.</p>

        <?php if ($error): ?>
            <div class="alert alert-error"><span><?= e($error) ?></span></div>
        <?php endif; ?>

        <form action="index.php?action=gallery&token=<?= urlencode($gallery['gallery_code']) ?>" method="POST">
            <input type="hidden" name="csrf_token" value="<?= e($csrf) ?>">
            <div class="form-group">
                <input type="password" name="password" class="form-control gate-input" placeholder="Enter Password" required autofocus>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Enter Gallery</button>
        </form>
    </div>
</div>
<?php
    $content = ob_get_clean();
    renderLayout('Private Gallery | ' . e($wedding['couple_name']), $content, false);
}

function renderDashboard(array $weddings, int $totalVideos, ?array $driveConn): void {
    ob_start();
?>
<div class="dashboard-header">
    <div>
        <h1 class="page-title">Wedding Projects</h1>
        <p class="page-subtitle">Manage client film delivery and Google Drive media connections</p>
    </div>
    <div class="header-actions">
        <a href="index.php?action=new_wedding" class="btn btn-primary">+ Create New Wedding</a>
    </div>
</div>

<div class="stats-grid">
    <div class="stat-card">
        <div class="stat-label">Total Weddings</div>
        <div class="stat-value"><?= count($weddings) ?></div>
    </div>
    <div class="stat-card">
        <div class="stat-label">Videos Delivered</div>
        <div class="stat-value"><?= $totalVideos ?></div>
    </div>
    <div class="stat-card">
        <div class="stat-label">Google Drive Status</div>
        <div class="stat-status">
            <?php if (!empty($driveConn['access_token'])): ?>
                <span class="badge badge-success">● Connected (OAuth 2.0)</span>
            <?php else: ?>
                <span class="badge badge-warning">● Not Connected</span>
                <a href="index.php?action=google_login" class="btn btn-xs btn-outline-gold">Connect OAuth</a>
            <?php endif; ?>
        </div>
    </div>
</div>

<div class="content-card">
    <div class="card-header-flex">
        <h2 class="card-title">All Wedding Galleries</h2>
        <span class="badge badge-gold"><?= count($weddings) ?> Projects</span>
    </div>

    <?php if (empty($weddings)): ?>
        <div style="text-align:center; padding: 40px 20px;">
            <div style="font-size: 3rem; margin-bottom: 12px;">🎬</div>
            <h3>No wedding projects created yet</h3>
            <p style="color:var(--text-muted); margin: 8px 0 20px;">Create your first wedding project and connect your Google Drive folder to begin delivering films.</p>
            <a href="index.php?action=new_wedding" class="btn btn-primary">Create First Wedding</a>
        </div>
    <?php else: ?>
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Couple Name</th>
                        <th>Wedding Date</th>
                        <th>Drive Folder</th>
                        <th>Events</th>
                        <th>Films</th>
                        <th>Client Gallery</th>
                        <th class="text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($weddings as $w): ?>
                        <tr>
                            <td>
                                <a href="index.php?action=videos&id=<?= $w['id'] ?>" style="font-weight: 600; color: #fff;">
                                    <?= e($w['couple_name']) ?>
                                </a>
                            </td>
                            <td><?= $w['wedding_date'] ? date('M d, Y', strtotime($w['wedding_date'])) : '—' ?></td>
                            <td>
                                <?php if (!empty($w['drive_folder_id'])): ?>
                                    <span class="badge badge-success" title="ID: <?= e($w['drive_folder_id']) ?>">Connected</span>
                                <?php else: ?>
                                    <span class="badge badge-muted">Not Set</span>
                                <?php endif; ?>
                            </td>
                            <td><strong><?= (int)($w['events_count'] ?? 0) ?></strong> events</td>
                            <td><strong><?= (int)($w['total_videos'] ?? 0) ?></strong> videos</td>
                            <td>
                                <?php if (!empty($w['gallery_code'])): ?>
                                    <a href="index.php?action=gallery&token=<?= e($w['gallery_code']) ?>" target="_blank" style="font-size:0.8rem;">
                                        /gallery ↗
                                    </a>
                                <?php endif; ?>
                            </td>
                            <td class="text-right">
                                <a href="index.php?action=videos&id=<?= $w['id'] ?>" class="btn btn-xs btn-outline">Manage</a>
                                <a href="index.php?action=scan&id=<?= $w['id'] ?>" class="btn btn-xs btn-outline-gold">Sync</a>
                                <a href="index.php?action=edit_wedding&id=<?= $w['id'] ?>" class="btn btn-xs btn-outline">Edit</a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>
<?php
    $content = ob_get_clean();
    renderLayout('Photographer Dashboard | ' . APP_NAME, $content, true);
}

function renderNewWeddingPage(?string $error): void {
    $csrf = generateCsrfToken();
    ob_start();
?>
<div class="form-card-container">
    <div class="content-card">
        <h1 class="card-title" style="margin-bottom: 6px;">Create Wedding Project</h1>
        <p class="page-subtitle" style="margin-bottom: 24px;">Enter couple details and link your Google Drive folder where your films are stored.</p>

        <?php if ($error): ?>
            <div class="alert alert-error"><span><?= e($error) ?></span></div>
        <?php endif; ?>

        <form action="index.php?action=new_wedding" method="POST">
            <input type="hidden" name="csrf_token" value="<?= e($csrf) ?>">
            
            <div class="form-section">
                <h3 class="section-title">1. Wedding Information</h3>
                <div class="form-group">
                    <label class="form-label">Couple Names *</label>
                    <input type="text" name="couple_name" class="form-control" placeholder="e.g. Harshil & Jahnavi" required>
                </div>
                <div class="form-grid-2">
                    <div class="form-group">
                        <label class="form-label">Wedding Date</label>
                        <input type="date" name="wedding_date" class="form-control">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Package Name</label>
                        <input type="text" name="package_name" class="form-control" value="Cinematic Wedding Package">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Cover Image URL</label>
                    <input type="url" name="cover_image" class="form-control" placeholder="https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2000&auto=format&fit=crop">
                </div>
                <div class="form-group">
                    <label class="form-label">Welcome Message for Couple</label>
                    <textarea name="welcome_message" rows="2" class="form-control" placeholder="Relive every heartfelt vow, emotion, and magical celebration in high definition."></textarea>
                </div>
            </div>

            <div class="form-section">
                <h3 class="section-title">2. Google Drive Storage Connection</h3>
                <div class="form-group">
                    <label class="form-label">Google Drive Folder Link or Folder ID</label>
                    <input type="text" name="drive_folder_url" class="form-control" placeholder="https://drive.google.com/drive/folders/13Kho6u93_s1mtJnjMXwXgwMTzivbIRXq">
                    <span class="form-hint">Subfolders (Haldi, Mehndi, Sangeet, Baraat, Wedding, Reception) and videos will be detected recursively.</span>
                </div>
            </div>

            <div class="form-section">
                <h3 class="section-title">3. Client Gallery Security & Features</h3>
                <div class="form-group">
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" name="password_enabled" value="1" onchange="document.getElementById('passField').style.display = this.checked ? 'block' : 'none';">
                        <span>Require password to unlock client gallery</span>
                    </label>
                </div>
                <div class="form-group" id="passField" style="display:none;">
                    <label class="form-label">Gallery Password</label>
                    <input type="text" name="gallery_password" class="form-control" placeholder="e.g. harshil2026">
                </div>
            </div>

            <div class="form-actions">
                <a href="index.php?action=dashboard" class="btn btn-outline">Cancel</a>
                <button type="submit" class="btn btn-primary">Create Project & Scan Videos</button>
            </div>
        </form>
    </div>
</div>
<?php
    $content = ob_get_clean();
    renderLayout('New Wedding | ' . APP_NAME, $content, true);
}

function renderEditWeddingPage(array $wedding, ?array $gallery, ?string $error): void {
    $csrf = generateCsrfToken();
    ob_start();
?>
<div class="form-card-container">
    <div class="content-card">
        <h1 class="card-title" style="margin-bottom: 6px;">Edit Wedding Project</h1>
        <p class="page-subtitle" style="margin-bottom: 24px;">Update details for <?= e($wedding['couple_name']) ?></p>

        <?php if ($error): ?>
            <div class="alert alert-error"><span><?= e($error) ?></span></div>
        <?php endif; ?>

        <form action="index.php?action=edit_wedding&id=<?= $wedding['id'] ?>" method="POST">
            <input type="hidden" name="csrf_token" value="<?= e($csrf) ?>">
            
            <div class="form-section">
                <h3 class="section-title">1. Wedding Information</h3>
                <div class="form-group">
                    <label class="form-label">Couple Names *</label>
                    <input type="text" name="couple_name" class="form-control" value="<?= e($wedding['couple_name']) ?>" required>
                </div>
                <div class="form-grid-2">
                    <div class="form-group">
                        <label class="form-label">Wedding Date</label>
                        <input type="date" name="wedding_date" class="form-control" value="<?= e($wedding['wedding_date']) ?>">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Package Name</label>
                        <input type="text" name="package_name" class="form-control" value="<?= e($wedding['package_name']) ?>">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Cover Image URL</label>
                    <input type="url" name="cover_image" class="form-control" value="<?= e($wedding['cover_image']) ?>">
                </div>
                <div class="form-group">
                    <label class="form-label">Welcome Message</label>
                    <textarea name="welcome_message" rows="2" class="form-control"><?= e($wedding['welcome_message']) ?></textarea>
                </div>
            </div>

            <div class="form-section">
                <h3 class="section-title">2. Google Drive Storage Connection</h3>
                <div class="form-group">
                    <label class="form-label">Google Drive Folder Link or Folder ID</label>
                    <input type="text" name="drive_folder_url" class="form-control" value="<?= e($wedding['drive_folder_url'] ?? $wedding['drive_folder_id']) ?>">
                </div>
            </div>

            <div class="form-section">
                <h3 class="section-title">3. Security</h3>
                <div class="form-group">
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" name="password_enabled" value="1" <?= !empty($gallery['password_enabled']) ? 'checked' : '' ?> onchange="document.getElementById('passField').style.display = this.checked ? 'block' : 'none';">
                        <span>Require password to unlock client gallery</span>
                    </label>
                </div>
                <div class="form-group" id="passField" style="display: <?= !empty($gallery['password_enabled']) ? 'block' : 'none' ?>;">
                    <label class="form-label">New Password (leave blank to keep current)</label>
                    <input type="text" name="gallery_password" class="form-control" placeholder="Enter new password">
                </div>
            </div>

            <div class="form-actions">
                <a href="index.php?action=videos&id=<?= $wedding['id'] ?>" class="btn btn-outline">Cancel</a>
                <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
        </form>
    </div>
</div>
<?php
    $content = ob_get_clean();
    renderLayout('Edit ' . e($wedding['couple_name']) . ' | ' . APP_NAME, $content, true);
}

function renderWeddingVideosPage(array $wedding, ?array $gallery, array $events, array $videos): void {
    $galleryUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . strtok($_SERVER['REQUEST_URI'] ?? '', '?') . '?action=gallery&token=' . ($gallery['gallery_code'] ?? '');

    // Group videos by event
    $videosByEvent = [];
    foreach ($videos as $v) {
        $eId = (int)($v['event_id'] ?? 0);
        $videosByEvent[$eId][] = $v;
    }

    $allVideosJson = [];
    foreach ($videos as $v) {
        $allVideosJson[] = [
            'id' => (int)$v['id'],
            'title' => $v['name'],
            'event' => 'Film',
            'streamUrl' => "index.php?action=stream&video={$v['id']}",
            'webViewUrl' => $v['web_view_url'] ?? '',
        ];
    }

    ob_start();
?>
<div class="project-hero">
    <div style="font-size:0.8rem; color:var(--text-muted); letter-spacing:0.1em; text-transform:uppercase;">
        <?= $wedding['wedding_date'] ? date('F d, Y', strtotime($wedding['wedding_date'])) : 'Wedding Film Delivery' ?>
    </div>
    <h1 class="project-title"><?= e($wedding['couple_name']) ?></h1>
    <p style="color:var(--text-muted); font-size:0.9rem; margin-top:4px;"><?= e($wedding['package_name']) ?></p>
</div>

<div class="admin-details-grid">
    <!-- Sidebar: Drive & Client Share Link -->
    <div>
        <div class="content-card" style="margin-bottom: 24px;">
            <h3 style="font-size:1.15rem; color:#fff; margin-bottom:8px;">Client Delivery Link</h3>
            <p style="font-size:0.85rem; color:var(--text-muted);">Share this private cinema link with the couple:</p>
            <div class="share-box">
                <input type="text" readonly value="<?= e($galleryUrl) ?>" id="clientShareInput" class="form-control-copy">
                <button class="btn btn-sm btn-primary" onclick="copyGalleryLink('clientShareInput')">Copy</button>
            </div>
            <div style="margin-top:16px; font-size:0.85rem;">
                <div style="display:flex; justify-content:space-between; margin-bottom:6px; color:var(--text-muted);">
                    <span>Security:</span>
                    <strong><?= !empty($gallery['password_enabled']) ? '🔒 Password Protected' : '🔓 Public Link' ?></strong>
                </div>
                <a href="<?= e($galleryUrl) ?>" target="_blank" class="btn btn-block btn-outline-gold" style="margin-top:12px;">
                    Preview Client Gallery ↗
                </a>
            </div>
        </div>

        <div class="content-card">
            <h3 style="font-size:1.15rem; color:#fff; margin-bottom:8px;">Google Drive Storage</h3>
            <div class="drive-info-box">
                <div class="drive-meta-row">
                    <span>Folder ID:</span>
                    <code style="color:var(--gold-light);"><?= e($wedding['drive_folder_id'] ?? 'Not set') ?></code>
                </div>
                <div class="drive-meta-row">
                    <span>Last Synced:</span>
                    <span><?= $wedding['last_scanned_at'] ? date('M d, H:i', strtotime($wedding['last_scanned_at'])) : 'Never' ?></span>
                </div>
                <div class="drive-meta-row">
                    <span>Films Detected:</span>
                    <strong><?= count($videos) ?> Videos</strong>
                </div>
            </div>

            <a href="index.php?action=scan&id=<?= $wedding['id'] ?>" class="btn btn-block btn-primary" style="margin-top:16px;">
                ⚡ Rescan Google Drive Folder
            </a>
            <a href="index.php?action=edit_wedding&id=<?= $wedding['id'] ?>" class="btn btn-block btn-outline" style="margin-top:8px;">
                Edit Project Settings
            </a>
        </div>
    </div>

    <!-- Media Pane: Event Folders & Videos -->
    <div>
        <div class="content-card">
            <div class="card-header-flex">
                <div>
                    <h2 class="card-title">Films & Media</h2>
                    <p class="page-subtitle">Video files detected in the connected Google Drive folder</p>
                </div>
                <span class="badge badge-gold"><?= count($videos) ?> Films</span>
            </div>

            <?php if (empty($videos)): ?>
                <div style="text-align:center; padding: 40px 20px;">
                    <div style="font-size: 3rem; margin-bottom: 12px;">📂</div>
                    <h3>No video files detected</h3>
                    <p style="color:var(--text-muted); margin: 8px 0 20px;">Ensure your Google Drive folder contains video files or event subfolders (.mp4, .mov, etc.), then click <strong>Rescan Google Drive</strong>.</p>
                    <a href="index.php?action=scan&id=<?= $wedding['id'] ?>" class="btn btn-primary">Scan Folder Now</a>
                </div>
            <?php else: ?>
                <?php foreach ($events as $ev): ?>
                    <?php $evVideos = $videosByEvent[$ev['id']] ?? []; if (empty($evVideos)) continue; ?>
                    <div class="event-section">
                        <div class="event-header">
                            <h3 class="event-name">✦ <?= e($ev['name']) ?></h3>
                            <span class="badge badge-muted"><?= count($evVideos) ?> Films</span>
                        </div>

                        <div class="videos-grid">
                            <?php foreach ($evVideos as $v): ?>
                                <div class="video-card">
                                    <div class="video-thumbnail-wrapper" onclick="openVideoPlayer(<?= $v['id'] ?>, '<?= e(addslashes($v['name'])) ?>', '<?= e(addslashes($ev['name'])) ?>', 'index.php?action=stream&video=<?= $v['id'] ?>', '<?= e($v['web_view_url'] ?? '') ?>')">
                                        <img src="<?= e($v['thumbnail_url'] ?? "https://drive.google.com/thumbnail?id={$v['drive_file_id']}&sz=w1280") ?>" alt="<?= e($v['name']) ?>" class="video-thumb" onerror="this.src='https://images.unsplash.com/photo-1537633552985-df8429e8048b?q=80&w=800&auto=format&fit=crop';">
                                        <div class="play-overlay">
                                            <div class="play-circle">▶</div>
                                        </div>
                                        <?php if ($v['duration_seconds']): ?>
                                            <span class="duration-badge"><?= formatDuration($v['duration_seconds']) ?></span>
                                        <?php endif; ?>
                                    </div>
                                    <div class="video-info">
                                        <h4 class="video-title" title="<?= e($v['name']) ?>"><?= e($v['name']) ?></h4>
                                        <div class="video-meta">
                                            <span><?= formatBytes((int)$v['file_size']) ?></span>
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
            <?php endif; ?>
        </div>
    </div>
</div>

<script>
    setPlaylist(<?= json_encode($allVideosJson) ?>);
</script>
<?php
    $content = ob_get_clean();
    renderLayout(e($wedding['couple_name']) . ' | Films & Media', $content, true);
}

function renderSettingsPage(array $settings): void {
    $csrf = generateCsrfToken();
    ob_start();
?>
<div class="form-card-container">
    <div class="content-card">
        <h1 class="card-title" style="margin-bottom: 6px;">Studio & Branding Settings</h1>
        <p class="page-subtitle" style="margin-bottom: 24px;">Customize the photography brand displayed to couples on their cinema galleries</p>

        <form action="index.php?action=settings" method="POST">
            <input type="hidden" name="csrf_token" value="<?= e($csrf) ?>">
            
            <div class="form-section">
                <div class="form-group">
                    <label class="form-label">Photography Studio Name</label>
                    <input type="text" name="studio_name" class="form-control" value="<?= e($settings['studio_name'] ?? 'Wedding Cinema Studio') ?>" required>
                </div>

                <div class="form-grid-2">
                    <div class="form-group">
                        <label class="form-label">Primary Accent Color</label>
                        <input type="color" name="primary_color" class="form-control" value="<?= e($settings['primary_color'] ?? '#D4AF37') ?>" style="height:44px; padding:2px;">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Website URL</label>
                        <input type="url" name="website" class="form-control" value="<?= e($settings['website'] ?? '') ?>" placeholder="https://yourstudio.com">
                    </div>
                </div>

                <div class="form-grid-2">
                    <div class="form-group">
                        <label class="form-label">Instagram Handle or Link</label>
                        <input type="text" name="instagram" class="form-control" value="<?= e($settings['instagram'] ?? '') ?>" placeholder="@yourstudio">
                    </div>
                    <div class="form-group">
                        <label class="form-label">WhatsApp Contact</label>
                        <input type="text" name="whatsapp" class="form-control" value="<?= e($settings['whatsapp'] ?? '') ?>" placeholder="+1 (555) 000-0000">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Gallery Footer Text</label>
                    <input type="text" name="footer_text" class="form-control" value="<?= e($settings['footer_text'] ?? 'Captured & Crafted with Love') ?>">
                </div>
            </div>

            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Save Branding Settings</button>
            </div>
        </form>
    </div>
</div>
<?php
    $content = ob_get_clean();
    renderLayout('Studio Settings | ' . APP_NAME, $content, true);
}

function renderClientGallery(array $wedding, array $gallery, array $events, array $videos, array $settings): void {
    $banner = !empty($wedding['cover_image']) ? $wedding['cover_image'] : 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2000&auto=format&fit=crop';
    $studio = $settings['studio_name'] ?? 'WEDDING CINEMA';

    // Group videos by event
    $videosByEvent = [];
    $allVideosJson = [];
    foreach ($videos as $v) {
        $eId = (int)($v['event_id'] ?? 0);
        $videosByEvent[$eId][] = $v;

        $eName = 'Film';
        foreach ($events as $ev) {
            if ($ev['id'] == $eId) { $eName = $ev['name']; break; }
        }

        $allVideosJson[] = [
            'id' => (int)$v['id'],
            'title' => $v['name'],
            'event' => $eName,
            'streamUrl' => "index.php?action=stream&video={$v['id']}",
            'webViewUrl' => $v['web_view_url'] ?? '',
        ];
    }

    ob_start();
?>
<div class="client-gallery-page">
    <!-- Hero Banner -->
    <header class="gallery-hero" style="background-image: linear-gradient(180deg, rgba(8,8,10,0.6) 0%, rgba(8,8,10,0.95) 100%), url('<?= e($banner) ?>');">
        <div class="gallery-hero-inner">
            <div class="studio-badge"><?= e($studio) ?></div>
            <p class="hero-pretitle">THE WEDDING CELEBRATION OF</p>
            <h1 class="hero-couple-title"><?= e($wedding['couple_name']) ?></h1>
            <?php if ($wedding['wedding_date']): ?>
                <div class="hero-date-divider">
                    <span class="divider-line"></span>
                    <span class="hero-date"><?= date('F d, Y', strtotime($wedding['wedding_date'])) ?></span>
                    <span class="divider-line"></span>
                </div>
            <?php endif; ?>
            <p class="hero-tagline"><?= e($wedding['welcome_message'] ?: 'Relive every heartfelt vow, emotion, and magical celebration in high definition.') ?></p>
        </div>
    </header>

    <!-- Content & Event Tabs -->
    <div class="gallery-container">
        <!-- Search & Event Filter Tabs -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px;">
            <?php if (count($events) > 1): ?>
                <div class="gallery-tabs" style="margin:0;">
                    <button class="gallery-tab-btn active" onclick="filterEvent('all', this)">All Films (<?= count($videos) ?>)</button>
                    <?php foreach ($events as $ev): ?>
                        <?php $count = count($videosByEvent[$ev['id']] ?? []); if ($count === 0) continue; ?>
                        <button class="gallery-tab-btn" onclick="filterEvent('event-<?= $ev['id'] ?>', this)">
                            <?= e($ev['name']) ?> (<?= $count ?>)
                        </button>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>

            <div style="min-width:220px; margin-left:auto;">
                <input type="text" id="videoSearchInput" oninput="searchVideos(this.value)" class="form-control" placeholder="🔍 Search films..." style="border-radius:var(--radius-full); padding:8px 16px;">
            </div>
        </div>

        <!-- Event Sections -->
        <div id="eventsContainer">
            <?php foreach ($events as $ev): ?>
                <?php $evVideos = $videosByEvent[$ev['id']] ?? []; if (empty($evVideos)) continue; ?>
                <div class="client-event-section" id="event-<?= $ev['id'] ?>">
                    <div class="client-event-header">
                        <h2 class="client-event-title"><?= e($ev['name']) ?></h2>
                        <span class="badge badge-muted"><?= count($evVideos) ?> <?= count($evVideos) === 1 ? 'Film' : 'Films' ?></span>
                    </div>

                    <div class="client-videos-grid">
                        <?php foreach ($evVideos as $v): ?>
                            <div class="client-video-card" data-title="<?= strtolower(e($v['name'])) ?>" onclick="openVideoPlayer(<?= $v['id'] ?>, '<?= e(addslashes($v['name'])) ?>', '<?= e(addslashes($ev['name'])) ?>', 'index.php?action=stream&video=<?= $v['id'] ?>', '<?= e($v['web_view_url'] ?? '') ?>')">
                                <div class="client-thumb-wrap">
                                    <img src="<?= e($v['thumbnail_url'] ?? "https://drive.google.com/thumbnail?id={$v['drive_file_id']}&sz=w1280") ?>" alt="<?= e($v['name']) ?>" class="client-video-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1537633552985-df8429e8048b?q=80&w=800&auto=format&fit=crop';">
                                    <div class="play-overlay">
                                        <div class="client-play-btn">▶</div>
                                    </div>
                                    <?php if ($v['duration_seconds']): ?>
                                        <span class="client-duration"><?= formatDuration($v['duration_seconds']) ?></span>
                                    <?php endif; ?>
                                </div>
                                <div class="client-video-meta">
                                    <h3 class="client-video-title"><?= e($v['name']) ?></h3>
                                    <div style="font-size:0.8rem; color:var(--text-muted); display:flex; gap:8px;">
                                        <span><?= e($ev['name']) ?></span>
                                        <span>• <?= formatBytes((int)$v['file_size']) ?></span>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Client Footer -->
    <footer class="client-gallery-footer">
        <div style="font-family:var(--font-heading); font-size:1.4rem; color:var(--gold-light); margin-bottom:6px;">
            <?= e($studio) ?>
        </div>
        <p><?= e($settings['footer_text'] ?? 'Captured & Crafted with Love') ?> for <?= e($wedding['couple_name']) ?>. Google Drive Cloud Streaming Delivery.</p>
    </footer>
</div>

<script>
    setPlaylist(<?= json_encode($allVideosJson) ?>);

    function filterEvent(eventId, btn) {
        document.querySelectorAll('.gallery-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const sections = document.querySelectorAll('.client-event-section');
        sections.forEach(sec => {
            sec.style.display = (eventId === 'all' || sec.id === eventId) ? 'block' : 'none';
        });
    }

    function searchVideos(query) {
        query = query.toLowerCase().trim();
        const cards = document.querySelectorAll('.client-video-card');
        cards.forEach(card => {
            const title = card.getAttribute('data-title') || '';
            card.style.display = (title.includes(query)) ? 'block' : 'none';
        });
    }
</script>
<?php
    $content = ob_get_clean();
    renderLayout(e($wedding['couple_name']) . ' | Wedding Films', $content, false);
}

function render404(string $message): void {
    ob_start();
?>
<div class="error-page-wrapper">
    <div class="error-card">
        <div style="font-size:4rem; font-family:var(--font-heading); color:var(--gold-primary); line-height:1;">404</div>
        <h1 style="font-size:1.75rem; margin: 12px 0 8px;"><?= e($message) ?></h1>
        <p style="color:var(--text-muted); font-size:0.9rem;">The requested wedding gallery or link could not be located or has expired.</p>
        <div style="margin-top:24px;">
            <a href="index.php?action=login" class="btn btn-outline-gold">Photographer Sign In</a>
        </div>
    </div>
</div>
<?php
    $content = ob_get_clean();
    renderLayout('404 Not Found', $content, false);
}
