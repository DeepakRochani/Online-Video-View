<?php

namespace App\Middleware;

use App\Core\Auth;
use App\Core\Request;
use App\Core\Response;

class GuestMiddleware
{
    public function handle(Request $request): bool
    {
        if (Auth::check()) {
            Response::redirect('/admin/dashboard');
            return false;
        }
        return true;
    }
}
