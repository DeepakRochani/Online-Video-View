<?php

namespace App\Controllers\Admin;

use App\Core\Auth;
use App\Core\Request;
use App\Core\View;
use App\Models\DriveConnection;
use App\Models\Wedding;

class DashboardController
{
    public function index(Request $request): void
    {
        $userId = Auth::id();
        $weddings = Wedding::findAllByUser($userId);
        $connection = DriveConnection::findByUserId($userId);

        $totalVideos = 0;
        foreach ($weddings as $w) {
            $totalVideos += (int)($w['total_videos'] ?? 0);
        }

        View::render('admin/dashboard', [
            'user' => Auth::user(),
            'weddings' => $weddings,
            'totalWeddings' => count($weddings),
            'totalVideos' => $totalVideos,
            'driveConnection' => $connection,
            'title' => 'Dashboard | Wedding Video Gallery'
        ], 'layouts/admin');
    }
}
