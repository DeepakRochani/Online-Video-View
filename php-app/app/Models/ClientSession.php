<?php

namespace App\Models;

use App\Core\Database;

class ClientSession
{
    public int $id;
    public int $gallery_id;
    public string $session_token_hash;
    public string $expires_at;
    public ?string $created_at = null;
    public ?string $updated_at = null;

    public static function createForGallery(int $galleryId, int $lifetimeHours = 48): string
    {
        $rawToken = bin2hex(random_bytes(24));
        $hash = hash('sha256', $rawToken);
        $expiresAt = date('Y-m-d H:i:s', time() + ($lifetimeHours * 3600));

        $sql = "INSERT INTO client_sessions (gallery_id, session_token_hash, expires_at) 
                VALUES (:gallery_id, :token_hash, :expires_at)";
        Database::query($sql, [
            'gallery_id' => $galleryId,
            'token_hash' => $hash,
            'expires_at' => $expiresAt,
        ]);

        return $rawToken;
    }

    public static function isValid(int $galleryId, ?string $rawToken): bool
    {
        if ($rawToken === null || trim($rawToken) === '') {
            return false;
        }

        $hash = hash('sha256', $rawToken);
        $sql = "SELECT id FROM client_sessions 
                WHERE gallery_id = :gallery_id 
                AND session_token_hash = :hash 
                AND expires_at > NOW() 
                LIMIT 1";
        $row = Database::fetch($sql, [
            'gallery_id' => $galleryId,
            'hash' => $hash,
        ]);

        return $row !== null;
    }
}
