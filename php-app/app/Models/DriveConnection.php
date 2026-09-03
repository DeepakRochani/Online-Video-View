<?php

namespace App\Models;

use App\Core\Database;
use App\Core\Encryption;

class DriveConnection
{
    public int $id;
    public int $user_id;
    public int $wedding_id;
    public string $folder_id;
    public string $folder_name;
    public ?string $access_token_encrypted = null;
    public ?string $refresh_token_encrypted = null;
    public ?string $token_expires_at = null;
    public ?string $resource_key = null;
    public string $status = 'connected';
    public ?string $last_synced_at = null;
    public ?string $created_at = null;
    public ?string $updated_at = null;

    public static function findByWeddingId(int $weddingId): ?self
    {
        $row = Database::fetch("SELECT * FROM drive_connections WHERE wedding_id = :wedding_id LIMIT 1", [
            'wedding_id' => $weddingId,
        ]);
        return $row ? self::hydrate($row) : null;
    }

    public static function upsert(array $data): self
    {
        $existing = self::findByWeddingId((int)$data['wedding_id']);

        if ($existing) {
            $sql = "UPDATE drive_connections SET 
                    folder_id = :folder_id,
                    folder_name = :folder_name,
                    access_token_encrypted = :access_token,
                    refresh_token_encrypted = :refresh_token,
                    token_expires_at = :token_expires_at,
                    resource_key = :resource_key,
                    status = :status,
                    last_synced_at = :last_synced_at
                    WHERE id = :id";
            Database::query($sql, [
                'id' => $existing->id,
                'folder_id' => $data['folder_id'],
                'folder_name' => $data['folder_name'],
                'access_token' => isset($data['access_token']) ? Encryption::encrypt($data['access_token']) : $existing->access_token_encrypted,
                'refresh_token' => isset($data['refresh_token']) ? Encryption::encrypt($data['refresh_token']) : $existing->refresh_token_encrypted,
                'token_expires_at' => $data['token_expires_at'] ?? $existing->token_expires_at,
                'resource_key' => $data['resource_key'] ?? $existing->resource_key,
                'status' => $data['status'] ?? 'connected',
                'last_synced_at' => $data['last_synced_at'] ?? date('Y-m-d H:i:s'),
            ]);
            return self::findByWeddingId((int)$data['wedding_id']);
        } else {
            $sql = "INSERT INTO drive_connections (user_id, wedding_id, folder_id, folder_name, access_token_encrypted, refresh_token_encrypted, token_expires_at, resource_key, status, last_synced_at)
                    VALUES (:user_id, :wedding_id, :folder_id, :folder_name, :access_token, :refresh_token, :token_expires_at, :resource_key, :status, :last_synced_at)";
            Database::query($sql, [
                'user_id' => $data['user_id'],
                'wedding_id' => $data['wedding_id'],
                'folder_id' => $data['folder_id'],
                'folder_name' => $data['folder_name'],
                'access_token' => isset($data['access_token']) ? Encryption::encrypt($data['access_token']) : null,
                'refresh_token' => isset($data['refresh_token']) ? Encryption::encrypt($data['refresh_token']) : null,
                'token_expires_at' => $data['token_expires_at'] ?? null,
                'resource_key' => $data['resource_key'] ?? null,
                'status' => $data['status'] ?? 'connected',
                'last_synced_at' => $data['last_synced_at'] ?? date('Y-m-d H:i:s'),
            ]);
            return self::findByWeddingId((int)$data['wedding_id']);
        }
    }

    public function getAccessToken(): ?string
    {
        return Encryption::decrypt($this->access_token_encrypted);
    }

    public function getRefreshToken(): ?string
    {
        return Encryption::decrypt($this->refresh_token_encrypted);
    }

    public static function hydrate(array $row): self
    {
        $c = new self();
        $c->id = (int)$row['id'];
        $c->user_id = (int)$row['user_id'];
        $c->wedding_id = (int)$row['wedding_id'];
        $c->folder_id = $row['folder_id'];
        $c->folder_name = $row['folder_name'];
        $c->access_token_encrypted = $row['access_token_encrypted'] ?? null;
        $c->refresh_token_encrypted = $row['refresh_token_encrypted'] ?? null;
        $c->token_expires_at = $row['token_expires_at'] ?? null;
        $c->resource_key = $row['resource_key'] ?? null;
        $c->status = $row['status'] ?? 'connected';
        $c->last_synced_at = $row['last_synced_at'] ?? null;
        $c->created_at = $row['created_at'] ?? null;
        $c->updated_at = $row['updated_at'] ?? null;
        return $c;
    }
}
