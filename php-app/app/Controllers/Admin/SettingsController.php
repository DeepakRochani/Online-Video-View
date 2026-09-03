<?php

namespace App\Controllers\Admin;

use App\Core\Auth;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Core\View;
use App\Models\GallerySetting;

class SettingsController
{
    public function index(Request $request): void
    {
        $userId = Auth::id();
        $settings = GallerySetting::findAllByUser($userId);

        View::render('admin/settings', [
            'settings' => $settings,
            'user' => Auth::user(),
            'title' => 'Studio & Branding Settings'
        ], 'layouts/admin');
    }

    public function update(Request $request): void
    {
        $userId = Auth::id();
        $studioName = trim($request->input('studio_name', ''));
        $primaryColor = trim($request->input('primary_color', '#D4AF37'));
        $logoUrl = trim($request->input('logo_url', ''));
        $contactEmail = trim($request->input('contact_email', ''));

        if (!empty($studioName)) {
            GallerySetting::setSetting($userId, 'studio_name', $studioName);
        }
        if (!empty($primaryColor)) {
            GallerySetting::setSetting($userId, 'primary_color', $primaryColor);
        }
        GallerySetting::setSetting($userId, 'logo_url', $logoUrl);
        GallerySetting::setSetting($userId, 'contact_email', $contactEmail);

        Session::flash('success', 'Studio branding settings updated successfully.');
        Response::redirect('/admin/settings');
    }
}
