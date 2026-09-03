<?php

namespace App\Models;

use App\Core\Database;

class Wedding
{
    public int $id;
    public int $user_id;
    public string $couple_name;
    public string $wedding_date;
    public string $package_name;
    public ?string $cover_image = null;
    public ?string $welcome_message = null;
    public string $status = 'active';
    public ?string $created_at = null;
    public ?string $updated_at = null;

    public static function all(int $userId): array
    {
        $rows = Database::fetchAll("SELECT * FROM weddings WHERE user_id = :user_id ORDER BY id DESC", [
            'user_id' => $userId,
        ]);
        return array_map([self::class, 'hydrate'], $rows);
    }

    public static function find(int $id): ?self
    {
        $row = Database::fetch("SELECT * FROM weddings WHERE id = :id LIMIT 1", ['id' => $id]);
        return $row ? self::hydrate($row) : null;
    }

    public static function create(array $data): self
    {
        $sql = "INSERT INTO weddings (user_id, couple_name, wedding_date, package_name, cover_image, welcome_message, status)
                VALUES (:user_id, :couple_name, :wedding_date, :package_name, :cover_image, :welcome_message, :status)";
        Database::query($sql, [
            'user_id' => $data['user_id'],
            'couple_name' => $data['couple_name'],
            'wedding_date' => $data['wedding_date'],
            'package_name' => $data['package_name'] ?? 'Full Wedding Cinema',
            'cover_image' => $data['cover_image'] ?? null,
            'welcome_message' => $data['welcome_message'] ?? null,
            'status' => $data['status'] ?? 'active',
        ]);

        return self::find((int)Database::lastInsertId());
    }

    public function update(array $data): void
    {
        $sql = "UPDATE weddings SET 
                couple_name = :couple_name,
                wedding_date = :wedding_date,
                package_name = :package_name,
                cover_image = :cover_image,
                welcome_message = :welcome_message,
                status = :status
                WHERE id = :id";
        Database::query($sql, [
            'id' => $this->id,
            'couple_name' => $data['couple_name'] ?? $this->couple_name,
            'wedding_date' => $data['wedding_date'] ?? $this->wedding_date,
            'package_name' => $data['package_name'] ?? $this->package_name,
            'cover_image' => $data['cover_image'] ?? $this->cover_image,
            'welcome_message' => $data['welcome_message'] ?? $this->welcome_message,
            'status' => $data['status'] ?? $this->status,
        ]);
    }

    public function delete(): void
    {
        Database::query("DELETE FROM weddings WHERE id = :id", ['id' => $this->id]);
    }

    public function driveConnection(): ?DriveConnection
    {
        return DriveConnection::findByWeddingId($this->id);
    }

    public function clientGallery(): ?ClientGallery
    {
        return ClientGallery::findByWeddingId($this->id);
    }

    public function events(): array
    {
        return EventModel::byWeddingId($this->id);
    }

    public function videos(): array
    {
        return Video::byWeddingId($this->id);
    }

    public static function hydrate(array $row): self
    {
        $w = new self();
        $w->id = (int)$row['id'];
        $w->user_id = (int)$row['user_id'];
        $w->couple_name = $row['couple_name'];
        $w->wedding_date = $row['wedding_date'];
        $w->package_name = $row['package_name'];
        $w->cover_image = $row['cover_image'] ?? null;
        $w->welcome_message = $row['welcome_message'] ?? null;
        $w->status = $row['status'] ?? 'active';
        $w->created_at = $row['created_at'] ?? null;
        $w->updated_at = $row['updated_at'] ?? null;
        return $w;
    }
}
