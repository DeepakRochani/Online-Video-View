<?php

return [
    'name' => $_ENV['APP_NAME'] ?? 'Wedding Video Gallery',
    'env' => $_ENV['APP_ENV'] ?? 'production',
    'url' => $_ENV['APP_URL'] ?? 'http://localhost:8000',
    'key' => $_ENV['APP_KEY'] ?? 'base64:4JscXv94W3dd1ngG4ll3ryS3cur1tyK3y2025==',
    'session_lifetime' => (int)($_ENV['SESSION_LIFETIME'] ?? 120),
];
