<?php

namespace App\Core;

use App\Models\User;

class Auth
{
    private const SESSION_USER_ID = '_admin_user_id';

    public static function login(User $user): void
    {
        Session::start();
        session_regenerate_id(true);
        Session::set(self::SESSION_USER_ID, $user->id);
    }

    public static function logout(): void
    {
        Session::remove(self::SESSION_USER_ID);
        Session::destroy();
    }

    public static function check(): bool
    {
        return Session::has(self::SESSION_USER_ID);
    }

    public static function id(): ?int
    {
        return Session::get(self::SESSION_USER_ID);
    }

    public static function user(): ?User
    {
        $id = self::id();
        if (!$id) return null;
        return User::find($id);
    }

    public static function attempt(string $email, string $password): bool
    {
        $user = User::findByEmail($email);
        if (!$user) return false;

        if (password_verify($password, $user->password)) {
            self::login($user);
            return true;
        }

        return false;
    }
}
