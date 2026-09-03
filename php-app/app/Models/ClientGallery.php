<?php

namespace App\Models;

use App\Core\Database;

class ClientGallery
{
    public int $id;
    public int $wedding_id;
    public string $secure_token_hash;
    public string $gallery_code;
    public ?string $password_hash = null;
    public bool $password_enabled = false;
    public bool $allow_download = true;
    public bool $allow_fullscreen = true;
    public bool $show_branding = true;
    public string $status = 'active';
    public ?string $created_at = null;
    public ?string $updated_at = null;

    public static function findByWeddingId(int $weddingId): ?self
    {
        $row = Database::fetch("SELECT * FROM client_galleries WHERE wedding_id = :wedding_id LIMIT 1", [
            'wedding_id' => $weddingId,
        ]);
        return $row ? self::hydrate($row) : null;
    }

    public static function findByCode(string $code): ?self
    {
        $row = Database::fetch("SELECT * FROM client_galleries WHERE gallery_code = :code LIMIT 1", [
            'code' => strtoupper($code),
        ]);
        return $row ? self::hydrate($row) : null;
    }

    public static function findByTokenHash(string $tokenHash): ?self
    {
        $row = Database::fetch("SELECT * FROM client_galleries WHERE secure_token_hash = :hash LIMIT 1", [
            'hash' => $tokenHash,
        ]);
        return $row ? self::hydrate($row) : null;
    }

    public static function createForWedding(int $weddingId, ?string $password = null): self
    {
        $rawToken = bin2hex(random_bytes(16));
        $tokenHash = hash('sha256', $rawToken);
        $galleryCode = self::generateUniqueCode();

        $passHash = ($password !== null && trim($password) !== '') ? password_hash($password, PASSWORD_DEFAULT) : null;

        $sql = "INSERT INTO client_galleries (wedding_id, secure_token_hash, gallery_code, password_hash, password_enabled) 
                VALUES (:wedding_id, :token_hash, :gallery_code, :pass_hash, :pass_enabled)";
        Database::query($sql, [
            'wedding_id' => $weddingId,
            'token_hash' => $tokenHash,
            'gallery_code' => $galleryCode,
            'pass_hash' => $passHash,
            'pass_enabled' => $passHash ? 1 : 0,
        ]);

        return self::findByWeddingId($weddingId);
    }

    public function updateSettings(array $data): void
    {
        $passHash = $this->password_hash;
        $passEnabled = $this->password_enabled ? 1 : 0;

        if (isset($data['password']) && trim($data['password']) !== '') {
            $passHash = password_hash($data['password'], PASSWORD_DEFAULT);
            $passEnabled = 1;
        } elseif (isset($data['password_enabled']) && !$data['password_enabled']) {
            $passHash = null;
            $passEnabled = 0;
        }

        $sql = "UPDATE client_galleries SET 
                password_hash = :password_hash,
                password_enabled = :password_enabled,
                allow_download = :allow_download,
                allow_fullscreen = :allow_fullscreen,
                show_branding = :show_branding,
                status = :status
                WHERE id = :id";
        Database::query($sql, [
            'id' => $this->id,
            'password_hash' => $passHash,
            'password_enabled' => $passEnabled,
            'allow_download' => isset($data['allow_download']) ? ($data['allow_download'] ? 1 : 0) : ($this->allow_download ? 1 : 0),
            'allow_fullscreen' => isset($data['allow_fullscreen']) ? ($data['allow_fullscreen'] ? 1 : 0) : ($this->allow_fullscreen ? 1 : 0),
            'show_branding' => isset($data['show_branding']) ? ($data['show_branding'] ? 1 : 0) : ($this->show_branding ? 1 : 0),
            'status' => $data['status'] ?? $this->status,
        ]);
    }

    private static function generateUniqueCode(): string
    {
        $chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        for ($i = 0; $i < 10; $i++) {
            $code = '';
            for ($j = 0; $j < 8; $j++) {
                $code .= $chars[random_int(0, strlen($chars) - 1)];
            }
            $existing = Database::fetch("SELECT id FROM client_galleries WHERE gallery_code = :code LIMIT 1", ['code' => $code]);
            if (!$existing) {
                return $code;
            }
        }
        return strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
    }

    public static function hydrate(array $row): self
    {
        $g = new self();
        $g->id = (int)$row['id'];
        $g->wedding_id = (int)$row['wedding_id'];
        $g->secure_token_hash = $row['secure_token_hash'];
        $g->gallery_code = $row['gallery_code'];
        $g->password_hash = $row['password_hash'] ?? null;
        $g->password_enabled = (bool)($row['password_enabled'] ?? false);
        $g->allow_download = (bool)($row['allow_download'] ?? true);
        $g->allow_fullscreen = (bool)($row['allow_fullscreen'] ?? true);
        $g->show_branding = (bool)($row['show_branding'] ?? true);
        $g->status = $row['status'] ?? 'active';
        $g->created_at = $row['created_at'] ?? null;
        $g->updated_at = $row['updated_at'] ?? null;
        return $g;
    }
}
