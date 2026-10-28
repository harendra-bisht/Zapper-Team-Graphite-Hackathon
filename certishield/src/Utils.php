<?php
declare(strict_types=1);

namespace CertiShield;

class Utils
{
    public static function e(mixed $value): string
    {
        return htmlspecialchars((string)($value ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    public static function uuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // set version to 0100
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // set bits 6-7 to 10
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    public static function generateCertificateCode(string $prefix = 'GPH-26'): string
    {
        $chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32 Crockford style (no 0, 1, I, O to avoid confusion)
        $code = '';
        $max = strlen($chars) - 1;
        for ($i = 0; $i < 6; $i++) {
            $code .= $chars[random_int(0, $max)];
        }
        return $prefix . '-' . $code;
    }

    public static function generateToken(): string
    {
        return bin2hex(random_bytes(24)); // 48 chars high-entropy hex
    }

    public static function canonicalHash(array $fields): string
    {
        // Normalize payload: sort keys, trim strings, encode UTF-8 JSON
        ksort($fields);
        $normalized = [];
        foreach ($fields as $k => $v) {
            $normalized[$k] = is_string($v) ? trim($v) : $v;
        }
        $json = json_encode($normalized, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        return hash('sha256', (string)$json);
    }

    public static function maskName(string $fullName): string
    {
        $words = preg_split('/\s+/', trim($fullName));
        $masked = [];
        foreach ($words as $w) {
            $len = mb_strlen($w, 'UTF-8');
            if ($len <= 2) {
                $masked[] = $w;
            } else {
                $first = mb_substr($w, 0, 1, 'UTF-8');
                $last = mb_substr($w, -1, 1, 'UTF-8');
                $masked[] = $first . str_repeat('*', max(1, $len - 2)) . $last;
            }
        }
        return implode(' ', $masked);
    }

    public static function maskIdentifier(?string $identifier): ?string
    {
        if (!$identifier || strlen(trim($identifier)) === 0) {
            return null;
        }
        $val = trim($identifier);
        $len = strlen($val);
        if ($len <= 3) {
            return '***';
        }
        return substr($val, 0, 2) . str_repeat('*', $len - 4) . substr($val, -2);
    }

    public static function hashIp(string $ip, string $salt): string
    {
        return hash('sha256', $ip . $salt);
    }
}
