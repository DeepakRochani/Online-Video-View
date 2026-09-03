<?php

namespace App\Services;

class GoogleDriveService
{
    private string $accessToken;
    private ?string $apiKey;

    public function __construct(string $accessToken = '', ?string $apiKey = null)
    {
        $this->accessToken = $accessToken;
        $this->apiKey = $apiKey ?: ($_ENV['GOOGLE_API_KEY'] ?? null);
    }

    public function listFiles(string $folderId, string $pageToken = ''): array
    {
        $q = sprintf("'%s' in parents and trashed = false", addslashes($folderId));
        $fields = 'nextPageToken, files(id, name, mimeType, size, videoMediaMetadata, thumbnailLink, webViewLink, createdTime, modifiedTime)';
        
        $params = [
            'q' => $q,
            'pageSize' => 100,
            'fields' => $fields,
            'supportsAllDrives' => 'true',
            'includeItemsFromAllDrives' => 'true',
            'orderBy' => 'folder, name_natural asc, modifiedTime desc',
        ];

        if (!empty($pageToken)) {
            $params['pageToken'] = $pageToken;
        }

        if (empty($this->accessToken) && !empty($this->apiKey)) {
            $params['key'] = $this->apiKey;
        }

        $url = 'https://www.googleapis.com/drive/v3/files?' . http_build_query($params);

        $headers = [];
        if (!empty($this->accessToken)) {
            $headers[] = 'Authorization: Bearer ' . $this->accessToken;
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new \RuntimeException("Google Drive API listFiles error (HTTP {$httpCode}): {$response}");
        }

        return json_decode($response, true) ?? [];
    }

    public function getFile(string $fileId): array
    {
        $fields = 'id, name, mimeType, size, videoMediaMetadata, thumbnailLink, webViewLink, createdTime';
        $params = [
            'fields' => $fields,
            'supportsAllDrives' => 'true',
        ];

        if (empty($this->accessToken) && !empty($this->apiKey)) {
            $params['key'] = $this->apiKey;
        }

        $url = "https://www.googleapis.com/drive/v3/files/{$fileId}?" . http_build_query($params);

        $headers = [];
        if (!empty($this->accessToken)) {
            $headers[] = 'Authorization: Bearer ' . $this->accessToken;
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 20,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new \RuntimeException("Google Drive API getFile error (HTTP {$httpCode}): {$response}");
        }

        return json_decode($response, true) ?? [];
    }
}
