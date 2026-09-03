<?php

namespace App\Core;

class Encryption
{
    private static function getKey(): string
    {
        $appKey = $_ENV['APP_KEY'] ?? 'base64:4JscXv94W3dd1ngG4ll3ryS3cur1tyK3y2025==';
        if (str_starts_with($appKey, 'base64:')) {
            $appKey = base64_decode(substr($appKey, 7));
        }
        return hash('sha256', $appKey, true);
    }

    public static function encrypt(?string $plaintext): ?string
    {
        if ($plaintext === null || $plaintext === '') {
            return null;
        }

        $key = self::getKey();
        $iv = openssl_random_pseudo_bytes(12); // 96-bit IV for GCM
        $tag = '';
        
        $ciphertext = openssl_encrypt(
            $plaintext,
            'aes-256-gcm',
            $key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );

        if ($ciphertext === false) {
            throw new \RuntimeException("Encryption failed");
        }

        return base64_encode($iv . $tag . $ciphertext);
    }

    public static function decrypt(?string $encrypted): ?string
    {
        if ($encrypted === null || $encrypted === '') {
            return null;
        }

        $raw = base64_decode($encrypted);
        if (strlen($raw) < 28) {
            return null;
        }

        $key = self::getKey();
        $iv = substr($raw, 0, 12);
        $tag = substr($raw, 12, 16);
        $ciphertext = substr($raw, 28);

        $plaintext = openssl_decrypt(
            $ciphertext,
            'aes-256-gcm',
            $key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );

        return $plaintext !== false ? $plaintext : null;
    }
}
