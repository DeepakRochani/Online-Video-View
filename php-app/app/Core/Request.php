<?php

namespace App\Core;

class Request
{
    private string $method;
    private string $uri;
    private array $queryParams;
    private array $body;
    private array $headers;

    public function __construct()
    {
        $this->method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        
        $requestUri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($requestUri, PHP_URL_PATH) ?? '/';
        $this->uri = '/' . trim($path, '/');

        $this->queryParams = $_GET;

        // Parse body
        if ($this->method === 'POST' || $this->method === 'PUT' || $this->method === 'PATCH') {
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            if (str_contains($contentType, 'application/json')) {
                $raw = file_get_contents('php://input');
                $this->body = json_decode($raw, true) ?? [];
            } else {
                $this->body = $_POST;
            }
        } else {
            $this->body = [];
        }

        // Headers
        $this->headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $headerName = strtolower(str_replace('_', '-', substr($key, 5)));
                $this->headers[$headerName] = $value;
            } elseif (in_array($key, ['CONTENT_TYPE', 'CONTENT_LENGTH'])) {
                $headerName = strtolower(str_replace('_', '-', $key));
                $this->headers[$headerName] = $value;
            }
        }
    }

    public function getMethod(): string
    {
        return $this->method;
    }

    public function getUri(): string
    {
        return $this->uri;
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return $this->queryParams[$key] ?? $this->body[$key] ?? $default;
    }

    public function all(): array
    {
        return array_merge($this->queryParams, $this->body);
    }

    public function header(string $name, ?string $default = null): ?string
    {
        $key = strtolower($name);
        return $this->headers[$key] ?? $default;
    }

    public function isJson(): bool
    {
        return str_contains($this->header('accept', ''), 'application/json') ||
               str_contains($this->header('content-type', ''), 'application/json');
    }
}
