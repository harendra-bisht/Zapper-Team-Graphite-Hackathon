<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/Utils.php';
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/Security.php';
require_once __DIR__ . '/../src/Auth.php';
require_once __DIR__ . '/../src/QRCodeService.php';
require_once __DIR__ . '/../src/CertificateService.php';
require_once __DIR__ . '/../src/VerificationService.php';
require_once __DIR__ . '/../src/PDFService.php';

use CertiShield\Database;
use CertiShield\Auth;
use CertiShield\CertificateService;
use CertiShield\Utils;

echo "--- Initializing CertiShield Database ---" . PHP_EOL;

$pdo = Database::getConnection();

// Execute Schema
$schemaSql = file_get_contents(__DIR__ . '/schema.sql');
// Remove comments and multi-statement execute
$pdo->exec($schemaSql);
echo "[✓] Schema tables verified and ready." . PHP_EOL;

// Clean existing seed users if any to ensure fresh demo data
$pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
$pdo->exec("TRUNCATE TABLE verification_logs;");
$pdo->exec("TRUNCATE TABLE audit_logs;");
$pdo->exec("TRUNCATE TABLE certificates;");
$pdo->exec("TRUNCATE TABLE events;");
$pdo->exec("TRUNCATE TABLE users;");
$pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

echo "[✓] Tables reset for fresh synthetic fixtures." . PHP_EOL;

// 1. Seed Administrator
$adminPass = password_hash('Admin@CertiShield2026', PASSWORD_DEFAULT);
$stmt = $pdo->prepare("
    INSERT INTO users (uuid, full_name, email, password_hash, role, status, organization_name)
    VALUES (:uuid, 'Campus Chief Administrator', 'admin@certishield.edu', :pass, 'admin', 'approved', 'Graphite Institute of Technology')
");
$stmt->execute([
    'uuid' => Utils::uuid(),
    'pass' => $adminPass,
]);
$adminId = (int)$pdo->lastInsertId();
echo "[✓] Seeded Platform Admin: admin@certishield.edu / Admin@CertiShield2026" . PHP_EOL;

// 2. Seed Approved Organizer: ACM Student Chapter
$org1Pass = password_hash('Organizer@ACM2026', PASSWORD_DEFAULT);
$stmt = $pdo->prepare("
    INSERT INTO users (uuid, full_name, email, password_hash, role, status, organization_name, contact_phone, institution_website)
    VALUES (:uuid, 'Sarah Jenkins', 'acm@studentchapter.edu', :pass, 'organizer', 'approved', 'ACM Student Chapter', '+91 9876543210', 'https://acm.studentchapter.edu')
");
$stmt->execute([
    'uuid' => Utils::uuid(),
    'pass' => $org1Pass,
]);
$org1Id = (int)$pdo->lastInsertId();
echo "[✓] Seeded Approved Organizer: acm@studentchapter.edu / Organizer@ACM2026" . PHP_EOL;

// 3. Seed Pending Organizer: Robotics Society (awaiting admin approval)
$org2Pass = password_hash('Pending@Robot2026', PASSWORD_DEFAULT);
$stmt = $pdo->prepare("
    INSERT INTO users (uuid, full_name, email, password_hash, role, status, organization_name, contact_phone, institution_website)
    VALUES (:uuid, 'Vikram Mehta', 'robotics@campus.edu', :pass, 'organizer', 'pending', 'Campus Robotics Society', '+91 9123456789', 'https://robotics.campus.edu')
");
$stmt->execute([
    'uuid' => Utils::uuid(),
    'pass' => $org2Pass,
]);
$org2Id = (int)$pdo->lastInsertId();
echo "[✓] Seeded Pending Organizer: robotics@campus.edu / Pending@Robot2026" . PHP_EOL;

// 4. Seed Event 1: GRAPHITE 26 National Hackathon
$event1Id = CertificateService::createEvent(
    $pdo,
    $org1Id,
    'GRAPHITE 26 National Hackathon',
    'Hackathon',
    '2026-10-25',
    'Main Auditorium, Graphite Tech Campus',
    'Flagship 48-hour annual hackathon problem-solving championship.'
);
echo "[✓] Seeded Event 1 (ID: {$event1Id}): GRAPHITE 26 National Hackathon" . PHP_EOL;

// 5. Seed Demonstration Certificates
// Demo 1: GENUINE ACTIVE CERTIFICATE (Aryan Sharma)
$tokenAryan = '00000000-0000-4000-8000-000000000001';
$codeAryan = 'GPH-26-8F29A';
$canonicalPayloadAryan = [
    'certificate_code' => $codeAryan,
    'event_title' => 'GRAPHITE 26 National Hackathon',
    'organization_name' => 'ACM Student Chapter',
    'recipient_name' => 'Aryan Sharma',
    'recipient_email' => 'aryan.sharma@example.edu',
    'recipient_identifier' => 'ROLL-2026-042',
    'role' => '1st Place Winner - AI Track',
    'issue_date' => '2026-10-26',
];
$canonicalHashAryan = Utils::canonicalHash($canonicalPayloadAryan);
$fileHashAryan = hash('sha256', json_encode($canonicalPayloadAryan) . '|SIGNED_BY_CERTISHIELD_KEY');

$stmt = $pdo->prepare("
    INSERT INTO certificates 
    (id, certificate_code, uuid, event_id, recipient_name, recipient_email, recipient_identifier, participation_role, issue_date, canonical_hash, file_hash, status)
    VALUES 
    (1, :code, :uuid, :event_id, 'Aryan Sharma', 'aryan.sharma@example.edu', 'ROLL-2026-042', '1st Place Winner - AI Track', '2026-10-26', :c_hash, :f_hash, 'active')
");
$stmt->execute([
    'code' => $codeAryan,
    'uuid' => $tokenAryan,
    'event_id' => $event1Id,
    'c_hash' => $canonicalHashAryan,
    'f_hash' => $fileHashAryan,
]);
echo "[✓] Seeded Demo 1 (GENUINE): Aryan Sharma (Code: {$codeAryan}, Token: {$tokenAryan})" . PHP_EOL;

// Demo 2: REVOKED CERTIFICATE (Dev Patel)
$tokenDev = '00000000-0000-4000-8000-000000000002';
$codeDev = 'GPH-26-REVOK';
$canonicalPayloadDev = [
    'certificate_code' => $codeDev,
    'event_title' => 'GRAPHITE 26 National Hackathon',
    'organization_name' => 'ACM Student Chapter',
    'recipient_name' => 'Dev Patel',
    'recipient_email' => 'dev.patel@example.edu',
    'recipient_identifier' => 'ROLL-2026-099',
    'role' => 'Participant',
    'issue_date' => '2026-10-26',
];
$stmt = $pdo->prepare("
    INSERT INTO certificates 
    (id, certificate_code, uuid, event_id, recipient_name, recipient_email, recipient_identifier, participation_role, issue_date, canonical_hash, file_hash, status, revocation_reason, revoked_at, revoked_by)
    VALUES 
    (2, :code, :uuid, :event_id, 'Dev Patel', 'dev.patel@example.edu', 'ROLL-2026-099', 'Participant', '2026-10-26', :c_hash, :f_hash, 'revoked', 'Disqualified for code plagiarism during evaluation.', '2026-10-27 10:15:00', :admin_id)
");
$stmt->execute([
    'code' => $codeDev,
    'uuid' => $tokenDev,
    'event_id' => $event1Id,
    'c_hash' => Utils::canonicalHash($canonicalPayloadDev),
    'f_hash' => hash('sha256', json_encode($canonicalPayloadDev) . '|SIGNED_BY_CERTISHIELD_KEY'),
    'admin_id' => $adminId,
]);
echo "[✓] Seeded Demo 2 (REVOKED): Dev Patel (Code: {$codeDev}, Token: {$tokenDev})" . PHP_EOL;

// Demo 3: EXPIRED CERTIFICATE (Priya Nair)
$tokenPriya = '00000000-0000-4000-8000-000000000003';
$codePriya = 'GPH-25-EXPIR';
$canonicalPayloadPriya = [
    'certificate_code' => $codePriya,
    'event_title' => 'GRAPHITE 26 National Hackathon',
    'organization_name' => 'ACM Student Chapter',
    'recipient_name' => 'Priya Nair',
    'recipient_email' => 'priya.nair@example.edu',
    'recipient_identifier' => 'ROLL-2025-014',
    'role' => 'Volunteer Credential',
    'issue_date' => '2025-01-10',
];
$stmt = $pdo->prepare("
    INSERT INTO certificates 
    (id, certificate_code, uuid, event_id, recipient_name, recipient_email, recipient_identifier, participation_role, issue_date, expiry_date, canonical_hash, file_hash, status)
    VALUES 
    (3, :code, :uuid, :event_id, 'Priya Nair', 'priya.nair@example.edu', 'ROLL-2025-014', 'Volunteer Credential', '2025-01-10', '2025-06-30', :c_hash, :f_hash, 'active')
");
$stmt->execute([
    'code' => $codePriya,
    'uuid' => $tokenPriya,
    'event_id' => $event1Id,
    'c_hash' => Utils::canonicalHash($canonicalPayloadPriya),
    'f_hash' => hash('sha256', json_encode($canonicalPayloadPriya) . '|SIGNED_BY_CERTISHIELD_KEY'),
]);
echo "[✓] Seeded Demo 3 (EXPIRED): Priya Nair (Code: {$codePriya}, Expiry: 2025-06-30)" . PHP_EOL;

echo "--- Seed Completed Successfully! ---" . PHP_EOL;
