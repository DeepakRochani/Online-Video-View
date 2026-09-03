<?php

namespace App\Controllers\Api;

use App\Core\Auth;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Models\ClientGallery;
use App\Models\DriveConnection;
use App\Models\Video;
use App\Models\Wedding;
use App\Services\VideoStreamService;

class VideoStreamController
{
    public function stream(Request $request, int $videoId): void
    {
        $video = Video::findById($videoId);
        if (!$video) {
            Response::json(['error' => 'Video not found'], 404);
            return;
        }

        $wedding = Wedding::findById((int)$video['wedding_id']);
        if (!$wedding) {
            Response::json(['error' => 'Associated wedding project not found'], 404);
            return;
        }

        // Authorization check: Either logged-in photographer OR unlocked client gallery session
        $isAuthorized = false;
        if (Auth::check() && Auth::id() === (int)$wedding['user_id']) {
            $isAuthorized = true;
        } else {
            $gallery = ClientGallery::findByWeddingId((int)$wedding['id']);
            if ($gallery && $gallery['is_active']) {
                if (empty($gallery['is_password_protected'])) {
                    $isAuthorized = true;
                } else {
                    $isAuthorized = Session::get("gallery_unlocked_{$gallery['id']}", false);
                }
            }
        }

        if (!$isAuthorized) {
            Response::json(['error' => 'Unauthorized access to video stream'], 403);
            return;
        }

        // Fetch photographer OAuth token if available
        $connection = DriveConnection::findByUserId((int)$wedding['user_id']);
        $accessToken = $connection['access_token'] ?? '';

        $streamService = new VideoStreamService();
        $rangeHeader = $request->header('Range');

        $streamService->stream($video['drive_file_id'], $rangeHeader, $accessToken);
    }
}
