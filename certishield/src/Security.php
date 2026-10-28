<?php
declare(strict_types=1);

namespace CertiShield;

use PDO;

class Security
{
    public static function startSession(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            if (!headers_sent()) {
                $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
                session_set_cookie_params([
                    'lifetime' => 7200,
                    'path' => '/',
                    'domain' => '',
                    'secure' => $isHttps,
                    'httponly' => true,
                    'samesite' => 'Lax'
                ]);
            }
            @session_start();
        }
    }

    public static function regenerateSession(): void
    {
        self::startSession();
        if (session_status() === PHP_SESSION_ACTIVE && !headers_sent()) {
            session_regenerate_id(true);
        }
    }

    public static function csrfToken(): string
    {
        self::startSession();
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }

    public static function csrfField(): string
    {
        return '<input type="hidden" name="csrf_token" value="' . Utils::e(self::csrfToken()) . '">';
    }

    public static function verifyCsrf(?string $submittedToken): bool
    {
        self::startSession();
        if (empty($_SESSION['csrf_token']) || empty($submittedToken)) {
            return false;
        }
        return hash_equals($_SESSION['csrf_token'], $submittedToken);
    }

    public static function requireCsrf(): void
    {
        $token = $_POST['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
        if (!self::verifyCsrf($token)) {
            http_response_code(403);
            die('CSRF token validation failed. Please refresh the page and try again.');
        }
    }

    public static function checkRateLimit(PDO $pdo, string $ipHash, int $limitPerMinute = 60): bool
    {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) AS total 
            FROM verification_logs 
            WHERE ip_hash = :ip_hash AND scanned_at >= (NOW() - INTERVAL 1 MINUTE)
        ");
        $stmt->execute(['ip_hash' => $ipHash]);
        $row = $stmt->fetch();
        return ((int)($row['total'] ?? 0)) < $limitPerMinute;
    }
}
