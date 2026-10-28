<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../src/Utils.php';
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/Security.php';
require_once __DIR__ . '/../src/VerificationService.php';

use CertiShield\Database;
use CertiShield\VerificationService;
use CertiShield\Security;
use CertiShield\Utils;

$pdo = Database::getConnection();

// Check IP Rate limit (60 requests / minute)
$ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
$ipHash = Utils::hashIp($ip, 'certishield_ip_salt_2026');

if (!Security::checkRateLimit($pdo, $ipHash, 60)) {
    http_response_code(429);
    echo json_encode([
        'status' => 'error',
        'message' => 'Rate limit exceeded. Maximum 60 verification queries per minute allowed.',
    ]);
    exit;
}

$identifier = trim((string)($_GET['id'] ?? $_GET['token'] ?? $_POST['identifier'] ?? ''));
$fileHash = $_POST['file_hash'] ?? null;

if ($identifier === '') {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Missing certificate identifier.',
    ]);
    exit;
}

$result = VerificationService::verify(
    $pdo,
    $identifier,
    $fileHash,
    $ip,
    $_SERVER['HTTP_USER_AGENT'] ?? 'API Client'
);

echo json_encode([
    'status' => 'success',
    'data' => $result,
]);
