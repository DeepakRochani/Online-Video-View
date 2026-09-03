<?php

namespace App\Services;

class DriveUrlParser
{
    /**
     * Extracts pure Google Drive folder ID and optional resourcekey from various URL formats.
     */
    public static function parse(string $urlOrId): ?array
    {
        $input = trim($urlOrId);
        if (empty($input)) {
            return null;
        }

        // Direct Folder ID pattern (typically 28 to 64 chars alphanumeric, _, -)
        if (preg_match('/^[a-zA-Z0-9_-]{15,70}$/', $input)) {
            return [
                'folder_id' => $input,
                'resource_key' => null,
            ];
        }

        // Match /folders/{id}
        if (preg_match('/\/folders\/([a-zA-Z0-9_-]+)/', $input, $matches)) {
            $folderId = $matches[1];
            $resourceKey = self::extractResourceKey($input);
            return [
                'folder_id' => $folderId,
                'resource_key' => $resourceKey,
            ];
        }

        // Match id={id}
        if (preg_match('/[?&]id=([a-zA-Z0-9_-]+)/', $input, $matches)) {
            $folderId = $matches[1];
            $resourceKey = self::extractResourceKey($input);
            return [
                'folder_id' => $folderId,
                'resource_key' => $resourceKey,
            ];
        }

        return null;
    }

    public static function extractFolderId(string $urlOrId): ?string
    {
        $res = self::parse($urlOrId);
        return $res['folder_id'] ?? null;
    }

    private static function extractResourceKey(string $url): ?string
    {
        if (preg_match('/[?&]resourcekey=([a-zA-Z0-9_-]+)/i', $url, $matches)) {
            return $matches[1];
        }
        return null;
    }
}
