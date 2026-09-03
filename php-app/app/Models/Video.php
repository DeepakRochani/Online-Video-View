<?php

namespace App\Models;

use App\Core\Database;

class Video
{
    public int $id;
    public int $wedding_id;
    public ?int $event_id = null;
    public string $drive_file_id;
    public string $drive_folder_id;
    public string $name;
    public string $mime_type = 'video/mp4';
    public int $file_size = 0;
    public ?string $thumbnail_url = null;
    public ?string $web_view_url = null;
    public ?string $created_time = null;
    public ?string $modified_time = null;
    public ?string $duration = null;
    public string $status = 'ready';
    public ?string $created_at = null;
    public ?string $updated_at = null;
    public ?string $event_name = null;

    public static function find(int $id): ?self
    {
        $row = Database::fetch("SELECT v.*, e.name AS event_name FROM videos v LEFT JOIN events e ON e.id = v.event_id WHERE v.id = :id LIMIT 1", ['id' => $id]);
        return $row ? self::hydrate($row) : null;
    }

    public static function findByDriveFileId(string $driveFileId): ?self
    {
        $row = Database::fetch("SELECT v.*, e.name AS event_name FROM videos v LEFT JOIN events e ON e.id = v.event_id WHERE v.drive_file_id = :df_id LIMIT 1", ['df_id' => $driveFileId]);
        return $row ? self::hydrate($row) : null;
    }

    public static function byWeddingId(int $weddingId): array
    {
        $sql = "SELECT v.*, e.name AS event_name 
                FROM videos v 
                LEFT JOIN events e ON e.id = v.event_id 
                WHERE v.wedding_id = :wedding_id 
                ORDER BY e.sort_order ASC, v.name ASC";
        $rows = Database::fetchAll($sql, ['wedding_id' => $weddingId]);
        return array_map([self::class, 'hydrate'], $rows);
    }

    public static function upsert(array $data): self
    {
        $sql = "INSERT INTO videos (
                    wedding_id, event_id, drive_file_id, drive_folder_id, 
                    name, mime_type, file_size, thumbnail_url, web_view_url, 
                    created_time, modified_time, status
                ) VALUES (
                    :wedding_id, :event_id, :drive_file_id, :drive_folder_id, 
                    :name, :mime_type, :file_size, :thumbnail_url, :web_view_url, 
                    :created_time, :modified_time, :status
                ) ON DUPLICATE KEY UPDATE 
                    event_id = VALUES(event_id),
                    drive_folder_id = VALUES(drive_folder_id),
                    name = VALUES(name),
                    mime_type = VALUES(mime_type),
                    file_size = VALUES(file_size),
                    thumbnail_url = VALUES(thumbnail_url),
                    web_view_url = VALUES(web_view_url),
                    modified_time = VALUES(modified_time),
                    status = VALUES(status),
                    updated_at = CURRENT_TIMESTAMP";

        Database::query($sql, [
            'wedding_id' => $data['wedding_id'],
            'event_id' => $data['event_id'] ?? null,
            'drive_file_id' => $data['drive_file_id'],
            'drive_folder_id' => $data['drive_folder_id'],
            'name' => $data['name'],
            'mime_type' => $data['mime_type'] ?? 'video/mp4',
            'file_size' => $data['file_size'] ?? 0,
            'thumbnail_url' => $data['thumbnail_url'] ?? null,
            'web_view_url' => $data['web_view_url'] ?? null,
            'created_time' => $data['created_time'] ?? null,
            'modified_time' => $data['modified_time'] ?? null,
            'status' => $data['status'] ?? 'ready',
        ]);

        return self::findByDriveFileId($data['drive_file_id']);
    }

    public static function hydrate(array $row): self
    {
        $v = new self();
        $v->id = (int)$row['id'];
        $v->wedding_id = (int)$row['wedding_id'];
        $v->event_id = isset($row['event_id']) ? (int)$row['event_id'] : null;
        $v->drive_file_id = $row['drive_file_id'];
        $v->drive_folder_id = $row['drive_folder_id'];
        $v->name = $row['name'];
        $v->mime_type = $row['mime_type'] ?? 'video/mp4';
        $v->file_size = (int)($row['file_size'] ?? 0);
        $v->thumbnail_url = $row['thumbnail_url'] ?? null;
        $v->web_view_url = $row['web_view_url'] ?? null;
        $v->created_time = $row['created_time'] ?? null;
        $v->modified_time = $row['modified_time'] ?? null;
        $v->duration = $row['duration'] ?? null;
        $v->status = $row['status'] ?? 'ready';
        $v->created_at = $row['created_at'] ?? null;
        $v->updated_at = $row['updated_at'] ?? null;
        $v->event_name = $row['event_name'] ?? null;
        return $v;
    }
}
