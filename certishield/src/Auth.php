<?php
declare(strict_types=1);

namespace CertiShield;

use PDO;
use RuntimeException;

class Auth
{
    public static function registerOrganizer(
        PDO $pdo,
        string $fullName,
        string $email,
        string $password,
        string $organizationName,
        ?string $phone = null,
        ?string $website = null
    ): int {
        $email = strtolower(trim($email));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException("Invalid email format.");
        }
        if (strlen($password) < 8) {
            throw new RuntimeException("Password must be at least 8 characters long.");
        }
        if (trim($organizationName) === '') {
            throw new RuntimeException("Organization name cannot be empty.");
        }

        // Check if email already exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
        $stmt->execute(['email' => $email]);
        if ($stmt->fetch()) {
            throw new RuntimeException("An account with this email address already exists.");
        }

        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $uuid = Utils::uuid();

        // Default role is 'organizer' and status is 'pending' (NEVER auto-admin or auto-approved)
        $insert = $pdo->prepare("
            INSERT INTO users (uuid, full_name, email, password_hash, role, status, organization_name, contact_phone, institution_website)
            VALUES (:uuid, :full_name, :email, :password_hash, 'organizer', 'pending', :org_name, :phone, :website)
        ");
        $insert->execute([
            'uuid' => $uuid,
            'full_name' => trim($fullName),
            'email' => $email,
            'password_hash' => $passwordHash,
            'org_name' => trim($organizationName),
            'phone' => $phone ? trim($phone) : null,
            'website' => $website ? trim($website) : null,
        ]);

        $userId = (int)$pdo->lastInsertId();

        self::logAudit($pdo, $userId, 'user_registered', 'users', (string)$userId, 'Organizer account registered (status: pending approval)');

        return $userId;
    }

    public static function login(PDO $pdo, string $email, string $password): array
    {
        $email = strtolower(trim($email));
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email LIMIT 1");
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        if (!$user) {
            // Constant-time dummy verify to thwart timing attacks
            password_verify($password, '$2y$10$abcdefghijklmnopqrstuvwxyz123456789012345678901234567890');
            throw new RuntimeException("Invalid email or password.");
        }

        // Check lockout
        if (!empty($user['locked_until']) && strtotime($user['locked_until']) > time()) {
            throw new RuntimeException("Account is temporarily locked due to multiple failed login attempts. Please try again later.");
        }

        if (!password_verify($password, $user['password_hash'])) {
            $failed = (int)$user['failed_login_attempts'] + 1;
            $lockSql = ($failed >= 5) ? ", locked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE)" : "";
            $upd = $pdo->prepare("UPDATE users SET failed_login_attempts = :failed {$lockSql} WHERE id = :id");
            $upd->execute(['failed' => $failed, 'id' => $user['id']]);

            throw new RuntimeException("Invalid email or password.");
        }

        // Reset failed attempts on success
        $upd = $pdo->prepare("UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = :id");
        $upd->execute(['id' => $user['id']]);

        // Setup session
        Security::regenerateSession();
        $_SESSION['user_id'] = (int)$user['id'];
        $_SESSION['user_uuid'] = $user['uuid'];
        $_SESSION['user_name'] = $user['full_name'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['user_role'] = $user['role'];
        $_SESSION['user_status'] = $user['status'];
        $_SESSION['organization_name'] = $user['organization_name'];

        self::logAudit($pdo, (int)$user['id'], 'user_login', 'users', (string)$user['id'], 'Successful login');

        return $user;
    }

    public static function logout(?PDO $pdo = null): void
    {
        Security::startSession();
        $userId = $_SESSION['user_id'] ?? null;
        if ($pdo && $userId) {
            self::logAudit($pdo, (int)$userId, 'user_logout', 'users', (string)$userId, 'User logged out');
        }
        $_SESSION = [];
        if (!headers_sent() && ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        if (session_status() === PHP_SESSION_ACTIVE) {
            @session_destroy();
        }
    }

    public static function getCurrentUser(): ?array
    {
        Security::startSession();
        if (empty($_SESSION['user_id'])) {
            return null;
        }
        return [
            'id' => (int)$_SESSION['user_id'],
            'uuid' => $_SESSION['user_uuid'] ?? '',
            'name' => $_SESSION['user_name'] ?? '',
            'email' => $_SESSION['user_email'] ?? '',
            'role' => $_SESSION['user_role'] ?? 'organizer',
            'status' => $_SESSION['user_status'] ?? 'pending',
            'organization_name' => $_SESSION['organization_name'] ?? '',
        ];
    }

    public static function requireRole(string ...$allowedRoles): array
    {
        $user = self::getCurrentUser();
        if (!$user) {
            header('Location: /login.php');
            exit;
        }

        if (!in_array($user['role'], $allowedRoles, true)) {
            http_response_code(403);
            die("Access Denied: You do not have permission to view this resource.");
        }

        return $user;
    }

    public static function requireApprovedOrganizer(PDO $pdo): array
    {
        $user = self::requireRole('organizer', 'admin');
        if ($user['role'] === 'admin') {
            return $user;
        }

        // Live check against database
        $stmt = $pdo->prepare("SELECT status FROM users WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $user['id']]);
        $status = $stmt->fetchColumn();

        if ($status !== 'approved') {
            http_response_code(403);
            die("Access Denied: Your organizer account is currently " . Utils::e($status) . ". An administrator must approve your account before you can create events or issue certificates.");
        }

        return $user;
    }

    public static function logAudit(PDO $pdo, ?int $userId, string $action, string $targetType, string $targetId, string $details): void
    {
        try {
            $stmt = $pdo->prepare("
                INSERT INTO audit_logs (user_id, action, target_type, target_id, ip_address, details)
                VALUES (:user_id, :action, :target_type, :target_id, :ip_address, :details)
            ");
            $stmt->execute([
                'user_id' => $userId,
                'action' => $action,
                'target_type' => $targetType,
                'target_id' => $targetId,
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
                'details' => $details,
            ]);
        } catch (\Throwable $e) {
            error_log("Audit log failed: " . $e->getMessage());
        }
    }
}
