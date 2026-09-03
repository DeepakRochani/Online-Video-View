<?php

namespace App\Models;

use App\Core\Database;

class EventModel
{
    public int $id;
    public int $wedding_id;
    public string $drive_folder_id;
    public string $name;
    public ?string $parent_folder_id = null;
    public int $sort_order = 0;
    public ?string $created_at = null;
    public ?string $updated_at = null;
    public int $video_count = 0;

    public static function byWeddingId(int $weddingId): array
    {
        $sql = "SELECT e.*, COUNT(v.id) AS video_count 
                FROM events e 
                LEFT JOIN videos v ON v.event_id = e.id 
                WHERE e.wedding_id = :wedding_id 
                GROUP BY e.id 
                ORDER BY e.sort_order ASC, e.name ASC";
        $rows = Database::fetchAll($sql, ['wedding_id' => $weddingId]);
        return array_map([self::class, 'hydrate'], $rows);
    }

    public static function findOrCreate(int $weddingId, string $driveFolderId, string $name, ?string $parentId = null): self
    {
        $row = Database::fetch("SELECT * FROM events WHERE wedding_id = :w_id AND drive_folder_id = :f_id LIMIT 1", [
            'w_id' => $weddingId,
            'f_id' => $driveFolderId,
        ]);

        if ($row) {
            if ($row['name'] !== $name) {
                Database::query("UPDATE events SET name = :name WHERE id = :id", [
                    'id' => $row['id'],
                    'name' => $name,
                ]);
            }
            return self::hydrate($row);
        }

        $sql = "INSERT INTO events (wedding_id, drive_folder_id, name, parent_folder_id) 
                VALUES (:wedding_id, :drive_folder_id, :name, :parent_folder_id)";
        Database::query($sql, [
            'wedding_id' => $weddingId,
            'drive_folder_id' => $driveFolderId,
            'name' => $name,
            'parent_folder_id' => $parentId,
        ]);

        $newId = (int)Database::lastInsertId();
        $newRow = Database::fetch("SELECT * FROM events WHERE id = :id", ['id' => $newId]);
        return self::hydrate($newRow);
    }

    public static function hydrate(array $row): self
    {
        $e = new self();
        $e->id = (int)$row['id'];
        $e->wedding_id = (int)$row['wedding_id'];
        $e->drive_folder_id = $row['drive_folder_id'];
        $e->name = $row['name'];
        $e->parent_folder_id = $row['parent_folder_id'] ?? null;
        $e->sort_order = (int)($row['sort_order'] ?? 0);
        $e->video_count = (int)($row['video_count'] ?? 0);
        $e->created_at = $row['created_at'] ?? null;
        $e->updated_at = $row['updated_at'] ?? null;
        return $e;
    }
}
