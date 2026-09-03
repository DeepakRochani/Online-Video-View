<?php

namespace App\Controllers\Gallery;

use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Core\View;
use App\Models\ClientGallery;
use App\Models\ClientSession;
use App\Models\EventModel;
use App\Models\GallerySetting;
use App\Models\Video;
use App\Models\Wedding;

class ClientGalleryController
{
    public function show(Request $request, string $accessCode): void
    {
        $gallery = ClientGallery::findByAccessCode($accessCode);
        if (!$gallery || empty($gallery['is_active'])) {
            View::render('errors/404', ['message' => 'Wedding Gallery Not Found or Expired'], 'layouts/client');
            return;
        }

        $wedding = Wedding::findById((int)$gallery['wedding_id']);
        if (!$wedding) {
            View::render('errors/404', ['message' => 'Wedding Project Not Found'], 'layouts/client');
            return;
        }

        // Check password protection
        if (!empty($gallery['is_password_protected'])) {
            $isUnlocked = Session::get("gallery_unlocked_{$gallery['id']}", false);
            if (!$isUnlocked) {
                View::render('gallery/password', [
                    'gallery' => $gallery,
                    'wedding' => $wedding,
                    'error' => Session::flash('error'),
                    'title' => 'Access Protected Gallery | ' . htmlspecialchars($wedding['couple_name'])
                ], 'layouts/client');
                return;
            }
        }

        // Log client visit session
        ClientSession::createSession((int)$gallery['id'], $request->ip(), $request->userAgent());

        // Fetch events and videos
        $weddingId = (int)$wedding['id'];
        $events = EventModel::findAllByWedding($weddingId);
        $videos = Video::findAllByWedding($weddingId);
        $settings = GallerySetting::findAllByUser((int)$wedding['user_id']);

        // Group videos by event
        $videosByEvent = [];
        foreach ($videos as $v) {
            $eId = (int)($v['event_id'] ?? 0);
            $videosByEvent[$eId][] = $v;
        }

        $eventsWithVideos = [];
        foreach ($events as $event) {
            $eId = (int)$event['id'];
            $eventVideos = $videosByEvent[$eId] ?? [];
            if (!empty($eventVideos)) {
                $event['videos'] = $eventVideos;
                $eventsWithVideos[] = $event;
            }
        }

        // If no events created or videos have event_id 0, create default group
        if (!empty($videosByEvent[0])) {
            $eventsWithVideos[] = [
                'id' => 0,
                'name' => 'Wedding Films',
                'videos' => $videosByEvent[0]
            ];
        }

        View::render('gallery/show', [
            'wedding' => $wedding,
            'gallery' => $gallery,
            'events' => $eventsWithVideos,
            'videos' => $videos,
            'settings' => $settings,
            'title' => htmlspecialchars($wedding['couple_name']) . ' | Wedding Film Gallery'
        ], 'layouts/client');
    }

    public function unlock(Request $request, string $accessCode): void
    {
        $gallery = ClientGallery::findByAccessCode($accessCode);
        if (!$gallery) {
            Response::redirect('/gallery/' . urlencode($accessCode));
            return;
        }

        $password = $request->input('password', '');
        if (password_verify($password, $gallery['password_hash'] ?? '')) {
            Session::set("gallery_unlocked_{$gallery['id']}", true);
            Response::redirect('/gallery/' . urlencode($accessCode));
            return;
        }

        Session::flash('error', 'Incorrect password. Please try again.');
        Response::redirect('/gallery/' . urlencode($accessCode));
    }
}
