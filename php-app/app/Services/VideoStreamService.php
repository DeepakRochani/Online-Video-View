<?php

namespace App\Services;

class VideoStreamService
{
    /**
     * Stream a Google Drive video file via HTTP 206 Partial Content
     */
    public function stream(string $driveFileId, ?string $clientRangeHeader = null, string $accessToken = ''): void
    {
        // Direct media download/stream endpoint for Google Drive
        $upstreamUrl = "https://drive.usercontent.google.com/download?id={$driveFileId}&export=download&authuser=0&confirm=t";

        // Setup cURL request
        $ch = curl_init($upstreamUrl);

        $headers = [
            'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        ];

        if (!empty($accessToken)) {
            $headers[] = 'Authorization: Bearer ' . $accessToken;
        }

        if (!empty($clientRangeHeader)) {
            $headers[] = 'Range: ' . $clientRangeHeader;
        }

        // Disable output buffering
        if (ob_get_level()) {
            ob_end_clean();
        }

        $headersSent = false;
        $responseHttpCode = 200;

        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_HEADERFUNCTION => function ($curl, $header) use (&$headersSent, &$responseHttpCode) {
                $len = strlen($header);
                $trimmed = trim($header);

                if (empty($trimmed)) {
                    $headersSent = true;
                    return $len;
                }

                // Parse HTTP Status code
                if (preg_match('#^HTTP/[\d\.]+\s+(\d+)#i', $trimmed, $m)) {
                    $responseHttpCode = (int)$m[1];
                    http_response_code($responseHttpCode);
                    return $len;
                }

                // Pass through relevant stream headers
                $allowedHeaders = [
                    'content-type',
                    'content-length',
                    'content-range',
                    'accept-ranges',
                    'cache-control',
                    'last-modified',
                    'etag'
                ];

                $parts = explode(':', $trimmed, 2);
                if (count($parts) === 2) {
                    $headerName = strtolower(trim($parts[0]));
                    $headerVal = trim($parts[1]);

                    if (in_array($headerName, $allowedHeaders, true)) {
                        header("{$parts[0]}: {$headerVal}");
                    }
                }

                return $len;
            },
            CURLOPT_WRITEFUNCTION => function ($curl, $data) {
                echo $data;
                flush();
                return strlen($data);
            },
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_TIMEOUT => 0, // No timeout during active streaming
            CURLOPT_BUFFERSIZE => 262144, // 256KB buffer
        ]);

        header('Accept-Ranges: bytes');
        curl_exec($ch);

        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError && !$headersSent) {
            http_response_code(502);
            echo "Stream proxy error: " . htmlspecialchars($curlError);
        }
    }
}
