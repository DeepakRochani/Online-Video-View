<?php

namespace App\Models;

use App\Core\Database;

class GallerySetting
{
    public int $id;
    public int $wedding_id;
    public string $business_name = 'DR Films Wedding Cinema';
    public ?string $logo = null;
    public ?string $website = null;
    public ?string $instagram = null;
    public ?string $whatsapp = null;
    public string $primary_color = '#D4AF37';
    public ?string $footer_text = null;
    public ?string $created_at = null;
    public ?string $updated_at = null;

    public static function findByWeddingId(int $weddingId): ?self
    {
        $row = Database::fetch("SELECT * FROM gallery_settings WHERE wedding_id = :wedding_id LIMIT 1", [
            'wedding_id' => $weddingId,
        ]);
        return $row ? self::hydrate($row) : null;
    }

    public static function createDefault(int $weddingId, string $businessName = 'DR Films Wedding Cinema'): self
    {
        $sql = "INSERT INTO gallery_settings (wedding_id, business_name, footer_text) 
                VALUES (:wedding_id, :b_name, :footer)";
        Database::query($sql, [
            'wedding_id' => $weddingId,
            'b_name' => $businessName,
            'footer' => "Delivered with love by {$businessName}",
        ]);

        return self::findByWeddingId($weddingId);
    }

    public static function hydrate(array $row): self
    {
        $s = new self();
        $s->id = (int)$row['id'];
        $s->wedding_id = (int)$row['wedding_id'];
        $s->business_name = $row['business_name'] ?? 'DR Films Wedding Cinema';
        $s->logo = $row['logo'] ?? null;
        $s->website = $row['website'] ?? null;
        $s->instagram = $row['instagram'] ?? null;
        $s->whatsapp = $row['whatsapp'] ?? null;
        $s->primary_color = $row['primary_color'] ?? '#D4AF37';
        $s->footer_text = $row['footer_text'] ?? null;
        $s->created_at = $row['created_at'] ?? null;
        $s->updated_at = $row['updated_at'] ?? null;
        return $s;
    }
}
