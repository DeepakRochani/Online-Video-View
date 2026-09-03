<?php

namespace App\Controllers\Admin;

use App\Core\Auth;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Core\View;

class AuthController
{
    public function showLogin(Request $request): void
    {
        View::render('admin/login', [
            'error' => Session::flash('error'),
            'success' => Session::flash('success')
        ], 'layouts/admin');
    }

    public function login(Request $request): void
    {
        $email = trim($request->input('email', ''));
        $password = $request->input('password', '');

        if (empty($email) || empty($password)) {
            Session::flash('error', 'Please enter both email and password.');
            Response::redirect('/admin/login');
            return;
        }

        if (Auth::attempt($email, $password)) {
            Response::redirect('/admin/dashboard');
            return;
        }

        Session::flash('error', 'Invalid email or password credentials.');
        Response::redirect('/admin/login');
    }

    public function logout(Request $request): void
    {
        Auth::logout();
        Response::redirect('/admin/login');
    }
}
