<?php

namespace App\Controllers\Admin;

use App\Core\Auth;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Models\DriveConnection;
use App\Services\GoogleAuthService;

class DriveController
{
    public function connect(Request $request): void
    {
        $userId = Auth::id();
        $authService = new GoogleAuthService();
        $state = bin2hex(random_bytes(16)) . ':' . $userId;
        Session::set('oauth_state', $state);

        $authUrl = $authService->getAuthUrl($state);
        Response::redirect($authUrl);
    }

    public function callback(Request $request): void
    {
        $code = $request->query('code', '');
        $state = $request->query('state', '');
        $savedState = Session::get('oauth_state', '');

        if (empty($code) || $state !== $savedState) {
            Session::flash('error', 'Google OAuth authorization state mismatch or invalid code.');
            Response::redirect('/admin/dashboard');
            return;
        }

        try {
            $authService = new GoogleAuthService();
            $tokens = $authService->exchangeCode($code);

            $userId = Auth::id();
            $accessToken = $tokens['access_token'] ?? '';
            $refreshToken = $tokens['refresh_token'] ?? '';
            $expiresIn = $tokens['expires_in'] ?? 3600;
            $expiresAt = date('Y-m-d H:i:s', time() + $expiresIn);

            DriveConnection::saveConnection($userId, $accessToken, $refreshToken, $expiresAt);

            Session::flash('success', 'Google Drive connected successfully via OAuth 2.0!');
        } catch (\Throwable $e) {
            Session::flash('error', 'Failed to connect Google Drive: ' . $e->getMessage());
        }

        Response::redirect('/admin/dashboard');
    }

    public function disconnect(Request $request): void
    {
        $userId = Auth::id();
        DriveConnection::deleteByUserId($userId);
        Session::flash('success', 'Google Drive disconnected.');
        Response::redirect('/admin/dashboard');
    }
}
