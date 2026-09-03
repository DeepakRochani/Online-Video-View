<?php

namespace App\Services;

use App\Models\DriveConnection;
use App\Models\EventModel;
use App\Models\Video;
use App\Models\Wedding;

class DriveScannerService
{
    private const VIDEO_EXTENSIONS = ['mp4', 'mov', 'mkv', 'avi', 'webm', 'm4v', 'ts', 'm2ts', 'wmv'];

    public function scanWeddingFolder(int $weddingId): array
    {
        $wedding = Wedding::findById($weddingId);
        if (!$wedding) {
            throw new \InvalidArgumentException("Wedding ID {$weddingId} not found");
        }

        $folderId = $wedding['drive_folder_id'];
        if (empty($folderId)) {
            $folderId = DriveUrlParser::extractFolderId($wedding['drive_folder_url'] ?? '');
            if (!$folderId) {
                throw new \InvalidArgumentException("No valid Google Drive folder ID or URL configured for this wedding");
            }
        }

        // Check if photographer has an active OAuth connection
        $connection = DriveConnection::findByUserId((int)$wedding['user_id']);
        $accessToken = '';
        if ($connection) {
            $accessToken = $connection['access_token'] ?? '';
            // Refresh if expired
            if (!empty($connection['token_expires_at']) && strtotime($connection['token_expires_at']) <= time() + 60) {
                if (!empty($connection['refresh_token'])) {
                    try {
                        $authService = new GoogleAuthService();
                        $tokens = $authService->refreshAccessToken($connection['refresh_token']);
                        $accessToken = $tokens['access_token'] ?? '';
                        DriveConnection::saveConnection(
                            (int)$wedding['user_id'],
                            $tokens['access_token'],
                            $tokens['refresh_token'] ?? $connection['refresh_token'],
                            date('Y-m-d H:i:s', time() + ($tokens['expires_in'] ?? 3600))
                        );
                    } catch (\Throwable $e) {
                        error_log("Token refresh failed: " . $e->getMessage());
                    }
                }
            }
        }

        $apiKey = $_ENV['GOOGLE_API_KEY'] ?? null;

        // Try API v3 scan first if token or API key exists
        $discovered = [];
        if (!empty($accessToken) || !empty($apiKey)) {
            try {
                $driveService = new GoogleDriveService($accessToken, $apiKey);
                $discovered = $this->scanFolderApi($driveService, $folderId, 'Main Highlights');
            } catch (\Throwable $e) {
                error_log("API v3 scan failed, trying public folder scan: " . $e->getMessage());
                $discovered = $this->scanFolderPublic($folderId);
            }
        } else {
            $discovered = $this->scanFolderPublic($folderId);
        }

        // Sync discovered events & videos into database
        $stats = $this->syncToDatabase($weddingId, $discovered);

        // Update wedding last_scanned_at
        Wedding::update($weddingId, [
            'last_scanned_at' => date('Y-m-d H:i:s'),
            'total_videos' => $stats['total_videos']
        ]);

        return [
            'wedding_id' => $weddingId,
            'events_count' => $stats['events_count'],
            'total_videos' => $stats['total_videos'],
            'items' => $discovered
        ];
    }

    private function scanFolderApi(GoogleDriveService $service, string $folderId, string $currentEventName): array
    {
        $results = [];
        $pageToken = '';

        do {
            $res = $service->listFiles($folderId, $pageToken);
            $files = $res['files'] ?? [];
            $pageToken = $res['nextPageToken'] ?? '';

            foreach ($files as $file) {
                $isFolder = ($file['mimeType'] ?? '') === 'application/vnd.google-apps.folder';
                $name = $file['name'] ?? 'Untitled';

                if ($isFolder) {
                    // Recursive scan subfolder as an Event
                    $subResults = $this->scanFolderApi($service, $file['id'], $name);
                    $results = array_merge($results, $subResults);
                } else {
                    if ($this->isVideoFile($file['mimeType'] ?? '', $name)) {
                        $meta = $file['videoMediaMetadata'] ?? [];
                        $results[] = [
                            'event_name' => $currentEventName,
                            'event_folder_id' => $folderId,
                            'drive_file_id' => $file['id'],
                            'title' => $this->cleanTitle($name),
                            'filename' => $name,
                            'mime_type' => $file['mimeType'] ?? 'video/mp4',
                            'file_size' => (int)($file['size'] ?? 0),
                            'duration_seconds' => isset($meta['durationMillis']) ? (int)round($meta['durationMillis'] / 1000) : null,
                            'width' => isset($meta['width']) ? (int)$meta['width'] : null,
                            'height' => isset($meta['height']) ? (int)$meta['height'] : null,
                            'thumbnail_url' => $file['thumbnailLink'] ?? "https://drive.google.com/thumbnail?id={$file['id']}&sz=w1280",
                            'web_view_link' => $file['webViewLink'] ?? "https://drive.google.com/file/d/{$file['id']}/view",
                        ];
                    }
                }
            }
        } while (!empty($pageToken));

        return $results;
    }

    public function scanFolderPublic(string $folderId): array
    {
        $url = "https://drive.google.com/drive/folders/{$folderId}";
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 20,
        ]);

        $html = curl_exec($ch);
        curl_close($ch);

        if (!$html) {
            return [];
        }

        $results = [];

        // Match _DRIVE_ivd JavaScript object
        if (preg_match('/_DRIVE_ivd\s*=\s*(\'|")(.*?)\1\s*;/s', $html, $matches)) {
            $rawJson = stripcslashes($matches[2]);
            $data = json_decode($rawJson, true);
            if (is_array($data) && isset($data[0])) {
                foreach ($data[0] as $item) {
                    if (!is_array($item)) continue;
                    $id = $item[0] ?? null;
                    $name = $item[2] ?? '';
                    $mimeType = $item[3] ?? '';
                    $size = $item[13] ?? 0;

                    if ($id && $this->isVideoFile($mimeType, $name)) {
                        $results[] = [
                            'event_name' => 'Main Highlights',
                            'event_folder_id' => $folderId,
                            'drive_file_id' => $id,
                            'title' => $this->cleanTitle($name),
                            'filename' => $name,
                            'mime_type' => $mimeType ?: 'video/mp4',
                            'file_size' => (int)$size,
                            'duration_seconds' => null,
                            'width' => null,
                            'height' => null,
                            'thumbnail_url' => "https://drive.google.com/thumbnail?id={$id}&sz=w1280",
                            'web_view_link' => "https://drive.google.com/file/d/{$id}/view",
                        ];
                    }
                }
            }
        }

        // Secondary regex fallback for items embedded in data arrays
        if (empty($results)) {
            preg_match_all('/\["([a-zA-Z0-9_-]{25,})",\["([^"]+\.(?:mp4|mov|mkv|webm|m4v))"/i', $html, $regexMatches, PREG_SET_ORDER);
            foreach ($regexMatches as $m) {
                $id = $m[1];
                $name = $m[2];
                $results[] = [
                    'event_name' => 'Main Highlights',
                    'event_folder_id' => $folderId,
                    'drive_file_id' => $id,
                    'title' => $this->cleanTitle($name),
                    'filename' => $name,
                    'mime_type' => 'video/mp4',
                    'file_size' => 0,
                    'duration_seconds' => null,
                    'width' => null,
                    'height' => null,
                    'thumbnail_url' => "https://drive.google.com/thumbnail?id={$id}&sz=w1280",
                    'web_view_link' => "https://drive.google.com/file/d/{$id}/view",
                ];
            }
        }

        return $results;
    }

    private function syncToDatabase(int $weddingId, array $discovered): array
    {
        // Group by event_name
        $eventsMap = [];
        foreach ($discovered as $item) {
            $eName = $item['event_name'] ?? 'Main Highlights';
            $eventsMap[$eName][] = $item;
        }

        $eventOrder = 0;
        $totalVideos = 0;

        foreach ($eventsMap as $eventName => $videos) {
            $event = EventModel::findByNameAndWedding($weddingId, $eventName);
            if (!$event) {
                $eventId = EventModel::create([
                    'wedding_id' => $weddingId,
                    'name' => $eventName,
                    'slug' => strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $eventName)),
                    'sort_order' => $eventOrder++
                ]);
            } else {
                $eventId = (int)$event['id'];
            }

            $videoOrder = 0;
            foreach ($videos as $v) {
                Video::upsertByDriveFileId([
                    'wedding_id' => $weddingId,
                    'event_id' => $eventId,
                    'drive_file_id' => $v['drive_file_id'],
                    'title' => $v['title'],
                    'filename' => $v['filename'],
                    'file_size' => $v['file_size'],
                    'mime_type' => $v['mime_type'],
                    'duration_seconds' => $v['duration_seconds'],
                    'width' => $v['width'],
                    'height' => $v['height'],
                    'thumbnail_url' => $v['thumbnail_url'],
                    'sort_order' => $videoOrder++,
                    'is_ready' => 1
                ]);
                $totalVideos++;
            }
        }

        return [
            'events_count' => count($eventsMap),
            'total_videos' => $totalVideos
        ];
    }

    public function isVideoFile(string $mimeType, string $filename): bool
    {
        if (str_starts_with($mimeType, 'video/')) {
            return true;
        }

        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        return in_array($ext, self::VIDEO_EXTENSIONS, true);
    }

    private function cleanTitle(string $filename): string
    {
        $base = pathinfo($filename, PATHINFO_FILENAME);
        // Replace dashes and underscores with spaces
        $clean = preg_replace('/[_\-\.]+/', ' ', $base);
        return ucwords(trim($clean));
    }
}
