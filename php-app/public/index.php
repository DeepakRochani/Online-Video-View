<?php

declare(strict_types=1);

// Report all errors in development
error_reporting(E_ALL);
ini_set('display_errors', '1');

// Autoload dependencies
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
} else {
    // Basic PSR-4 fallback autoloader if composer install hasn't been run yet
    spl_autoload_register(function ($class) {
        $prefix = 'App\\';
        $baseDir = __DIR__ . '/../app/';

        $len = strlen($prefix);
        if (strncmp($prefix, $class, $len) !== 0) {
            return;
        }

        $relativeClass = substr($class, $len);
        $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

        if (file_exists($file)) {
            require $file;
        }
    });
}

// Load .env file
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) {
            continue;
        }
        [$name, $value] = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value, " \t\n\r\0\x0B\"'");
        $_ENV[$name] = $value;
        putenv("{$name}={$value}");
    }
}

use App\Controllers\Admin\AuthController;
use App\Controllers\Admin\DashboardController;
use App\Controllers\Admin\DriveController;
use App\Controllers\Admin\SettingsController;
use App\Controllers\Admin\WeddingController;
use App\Controllers\Api\DriveApiController;
use App\Controllers\Api\VideoStreamController;
use App\Controllers\Gallery\ClientGalleryController;
use App\Core\Request;
use App\Core\Router;
use App\Core\Session;
use App\Middleware\AuthMiddleware;
use App\Middleware\GuestMiddleware;

// Initialize Session
Session::start();

// Initialize Router
$router = new Router();

// ==========================================
// Public & Client Routes
// ==========================================
$router->get('/', function (Request $req) {
    header('Location: /admin/dashboard');
    exit;
});

$router->get('/gallery/{code}', [ClientGalleryController::class, 'show']);
$router->post('/gallery/{code}/unlock', [ClientGalleryController::class, 'unlock']);

// Stream Video API (Public / Authenticated with 206 Range Support)
$router->get('/api/videos/{id}/stream', [VideoStreamController::class, 'stream']);

// ==========================================
// Authentication Routes
// ==========================================
$router->get('/admin/login', [AuthController::class, 'showLogin'], [GuestMiddleware::class]);
$router->post('/admin/login', [AuthController::class, 'login'], [GuestMiddleware::class]);
$router->get('/admin/logout', [AuthController::class, 'logout']);

// ==========================================
// Protected Photographer Admin Routes
// ==========================================
$router->get('/admin/dashboard', [DashboardController::class, 'index'], [AuthMiddleware::class]);

$router->get('/admin/weddings/create', [WeddingController::class, 'create'], [AuthMiddleware::class]);
$router->post('/admin/weddings', [WeddingController::class, 'store'], [AuthMiddleware::class]);
$router->get('/admin/weddings/{id}', [WeddingController::class, 'show'], [AuthMiddleware::class]);
$router->get('/admin/weddings/{id}/edit', [WeddingController::class, 'edit'], [AuthMiddleware::class]);
$router->post('/admin/weddings/{id}', [WeddingController::class, 'update'], [AuthMiddleware::class]);
$router->post('/admin/weddings/{id}/delete', [WeddingController::class, 'destroy'], [AuthMiddleware::class]);
$router->post('/admin/weddings/{id}/scan', [WeddingController::class, 'scan'], [AuthMiddleware::class]);

// Google OAuth flow
$router->get('/admin/drive/connect', [DriveController::class, 'connect'], [AuthMiddleware::class]);
$router->get('/admin/drive/callback', [DriveController::class, 'callback']);
$router->post('/admin/drive/disconnect', [DriveController::class, 'disconnect'], [AuthMiddleware::class]);

// Settings
$router->get('/admin/settings', [SettingsController::class, 'index'], [AuthMiddleware::class]);
$router->post('/admin/settings', [SettingsController::class, 'update'], [AuthMiddleware::class]);

// AJAX API
$router->post('/api/weddings/{id}/scan', [DriveApiController::class, 'scanWedding'], [AuthMiddleware::class]);

// Dispatch incoming request
$request = new Request();
$router->dispatch($request);
