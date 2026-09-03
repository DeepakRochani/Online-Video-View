<?php

namespace App\Controllers\Api;

use App\Core\Auth;
use App\Core\Request;
use App\Core\Response;
use App\Models\Wedding;
use App\Services\DriveScannerService;

class DriveApiController
{
    public function scanWedding(Request $request, int $weddingId): void
    {
        if (!Auth::check()) {
            Response::json(['error' => 'Unauthorized'], 401);
            return;
        }

        $wedding = Wedding::findById($weddingId);
        if (!$wedding || (int)$wedding['user_id'] !== Auth::id()) {
            Response::json(['error' => 'Wedding not found or access denied'], 404);
            return;
        }

        try {
            $scanner = new DriveScannerService();
            $result = $scanner->scanWeddingFolder($weddingId);
            Response::json([
                'success' => true,
                'message' => "Successfully detected {$result['total_videos']} videos across {$result['events_count']} event folders",
                'data' => $result
            ]);
        } catch (\Throwable $e) {
            Response::json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
