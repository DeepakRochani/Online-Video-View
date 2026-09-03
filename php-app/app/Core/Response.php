<?php

namespace App\Core;

class Response
{
    public static function json(mixed $data, int $status = 200, array $headers = []): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        foreach ($headers as $key => $value) {
            header("{$key}: {$value}");
        }
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function redirect(string $url, int $status = 302): void
    {
        http_response_code($status);
        header("Location: {$url}");
        exit;
    }

    public static function html(string $html, int $status = 200, array $headers = []): void
    {
        http_response_code($status);
        header('Content-Type: text/html; charset=utf-8');
        foreach ($headers as $key => $value) {
            header("{$key}: {$value}");
        }
        echo $html;
        exit;
    }

    public static function error(string $message, int $status = 400): void
    {
        self::json(['success' => false, 'error' => $message], $status);
    }
}
