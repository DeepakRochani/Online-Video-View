<?php

return [
    'client_id' => $_ENV['GOOGLE_CLIENT_ID'] ?? '',
    'client_secret' => $_ENV['GOOGLE_CLIENT_SECRET'] ?? '',
    'redirect_uri' => $_ENV['GOOGLE_REDIRECT_URI'] ?? 'http://localhost:8000/admin/drive/callback',
    'api_key' => $_ENV['GOOGLE_DRIVE_API_KEY'] ?? '',
    'scopes' => [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
    ],
];
