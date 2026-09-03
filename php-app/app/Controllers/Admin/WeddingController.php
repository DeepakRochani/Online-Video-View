<?php

namespace App\Controllers\Admin;

use App\Core\Auth;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Core\View;
use App\Models\ClientGallery;
use App\Models\EventModel;
use App\Models\Video;
use App\Models\Wedding;
use App\Services\DriveScannerService;
use App\Services\DriveUrlParser;

class WeddingController
{
    public function create(Request $request): void
    {
        View::render('admin/weddings/create', [
            'user' => Auth::user(),
            'title' => 'Create Wedding Project'
        ], 'layouts/admin');
    }

    public function store(Request $request): void
    {
        $coupleName = trim($request->input('couple_name', ''));
        $weddingDate = $request->input('wedding_date', null);
        $driveUrl = trim($request->input('drive_folder_url', ''));
        $bannerUrl = trim($request->input('banner_image_url', ''));
        $requirePassword = (bool)$request->input('require_password', false);
        $rawPassword = $request->input('gallery_password', '');

        if (empty($coupleName)) {
            Session::flash('error', 'Couple Name is required.');
            Response::redirect('/admin/weddings/create');
            return;
        }

        $folderId = DriveUrlParser::extractFolderId($driveUrl);

        $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $coupleName)) . '-' . rand(1000, 9999);
        $userId = Auth::id();

        $weddingId = Wedding::create([
            'user_id' => $userId,
            'couple_name' => $coupleName,
            'slug' => $slug,
            'wedding_date' => $weddingDate ?: null,
            'banner_image_url' => $bannerUrl ?: null,
            'drive_folder_id' => $folderId ?: null,
            'drive_folder_url' => $driveUrl ?: null,
            'status' => 'published'
        ]);

        // Generate Client Gallery Access Code
        $accessCode = ClientGallery::generateUniqueAccessCode();
        $passwordHash = ($requirePassword && !empty($rawPassword)) ? password_hash($rawPassword, PASSWORD_BCRYPT) : null;

        ClientGallery::create([
            'wedding_id' => $weddingId,
            'access_code' => $accessCode,
            'is_password_protected' => $requirePassword ? 1 : 0,
            'password_hash' => $passwordHash,
            'is_active' => 1
        ]);

        // Auto-scan if folder ID is present
        if ($folderId) {
            try {
                $scanner = new DriveScannerService();
                $stats = $scanner->scanWeddingFolder($weddingId);
                Session::flash('success', "Wedding created! Detected {$stats['total_videos']} videos across {$stats['events_count']} event folders.");
            } catch (\Throwable $e) {
                Session::flash('warning', "Wedding created, but initial Google Drive scan encountered an issue: " . $e->getMessage() . ". You can retry scanning anytime.");
            }
        } else {
            Session::flash('success', 'Wedding created successfully! Connect a Google Drive folder to import videos.');
        }

        Response::redirect("/admin/weddings/{$weddingId}");
    }

    public function show(Request $request, int $id): void
    {
        $wedding = Wedding::findById($id);
        if (!$wedding || (int)$wedding['user_id'] !== Auth::id()) {
            Response::redirect('/admin/dashboard');
            return;
        }

        $events = EventModel::findAllByWedding($id);
        $videos = Video::findAllByWedding($id);
        $gallery = ClientGallery::findByWeddingId($id);

        // Group videos by event
        $eventsWithVideos = [];
        $videosByEvent = [];
        foreach ($videos as $v) {
            $eId = (int)($v['event_id'] ?? 0);
            $videosByEvent[$eId][] = $v;
        }

        foreach ($events as $event) {
            $eId = (int)$event['id'];
            $event['videos'] = $videosByEvent[$eId] ?? [];
            $eventsWithVideos[] = $event;
        }

        // Catch videos with event_id = 0 or null
        if (!empty($videosByEvent[0])) {
            $eventsWithVideos[] = [
                'id' => 0,
                'name' => 'General Films',
                'videos' => $videosByEvent[0]
            ];
        }

        View::render('admin/weddings/show', [
            'wedding' => $wedding,
            'events' => $eventsWithVideos,
            'videos' => $videos,
            'gallery' => $gallery,
            'title' => htmlspecialchars($wedding['couple_name']) . ' | Wedding Project'
        ], 'layouts/admin');
    }

    public function edit(Request $request, int $id): void
    {
        $wedding = Wedding::findById($id);
        if (!$wedding || (int)$wedding['user_id'] !== Auth::id()) {
            Response::redirect('/admin/dashboard');
            return;
        }

        $gallery = ClientGallery::findByWeddingId($id);

        View::render('admin/weddings/edit', [
            'wedding' => $wedding,
            'gallery' => $gallery,
            'title' => 'Edit ' . htmlspecialchars($wedding['couple_name'])
        ], 'layouts/admin');
    }

    public function update(Request $request, int $id): void
    {
        $wedding = Wedding::findById($id);
        if (!$wedding || (int)$wedding['user_id'] !== Auth::id()) {
            Response::redirect('/admin/dashboard');
            return;
        }

        $coupleName = trim($request->input('couple_name', ''));
        $weddingDate = $request->input('wedding_date', null);
        $driveUrl = trim($request->input('drive_folder_url', ''));
        $bannerUrl = trim($request->input('banner_image_url', ''));
        $requirePassword = (bool)$request->input('require_password', false);
        $rawPassword = $request->input('gallery_password', '');

        if (empty($coupleName)) {
            Session::flash('error', 'Couple Name is required.');
            Response::redirect("/admin/weddings/{$id}/edit");
            return;
        }

        $folderId = DriveUrlParser::extractFolderId($driveUrl);

        Wedding::update($id, [
            'couple_name' => $coupleName,
            'wedding_date' => $weddingDate ?: null,
            'banner_image_url' => $bannerUrl ?: null,
            'drive_folder_id' => $folderId ?: null,
            'drive_folder_url' => $driveUrl ?: null,
        ]);

        $gallery = ClientGallery::findByWeddingId($id);
        if ($gallery) {
            $galleryData = [
                'is_password_protected' => $requirePassword ? 1 : 0
            ];
            if ($requirePassword && !empty($rawPassword)) {
                $galleryData['password_hash'] = password_hash($rawPassword, PASSWORD_BCRYPT);
            } elseif (!$requirePassword) {
                $galleryData['password_hash'] = null;
            }
            ClientGallery::update((int)$gallery['id'], $galleryData);
        }

        Session::flash('success', 'Wedding details updated successfully.');
        Response::redirect("/admin/weddings/{$id}");
    }

    public function destroy(Request $request, int $id): void
    {
        $wedding = Wedding::findById($id);
        if ($wedding && (int)$wedding['user_id'] === Auth::id()) {
            Wedding::delete($id);
            Session::flash('success', 'Wedding project deleted successfully.');
        }

        Response::redirect('/admin/dashboard');
    }

    public function scan(Request $request, int $id): void
    {
        $wedding = Wedding::findById($id);
        if (!$wedding || (int)$wedding['user_id'] !== Auth::id()) {
            Response::redirect('/admin/dashboard');
            return;
        }

        try {
            $scanner = new DriveScannerService();
            $stats = $scanner->scanWeddingFolder($id);
            Session::flash('success', "Google Drive scan completed: {$stats['total_videos']} videos synced across {$stats['events_count']} event folders.");
        } catch (\Throwable $e) {
            Session::flash('error', "Scan error: " . $e->getMessage());
        }

        Response::redirect("/admin/weddings/{$id}");
    }
}
