<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/Utils.php';
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/QRCodeService.php';
require_once __DIR__ . '/../src/PDFService.php';

use CertiShield\Database;
use CertiShield\PDFService;
use CertiShield\Utils;

$pdo = Database::getConnection();

$identifier = trim((string)($_GET['id'] ?? ''));
if ($identifier === '') {
    die("Missing certificate ID.");
}

$stmt = $pdo->prepare("
    SELECT c.*, e.title as event_title, u.organization_name
    FROM certificates c
    JOIN events e ON c.event_id = e.id
    JOIN users u ON e.user_id = u.id
    WHERE c.certificate_code = :code OR c.uuid = :uuid
    LIMIT 1
");
$stmt->execute(['code' => $identifier, 'uuid' => $identifier]);
$cert = $stmt->fetch();

if (!$cert) {
    http_response_code(404);
    die("Certificate not found.");
}

$appUrl = 'http://localhost:8000'; // Or dynamically detect
$verificationUrl = $appUrl . '/verify.php?id=' . urlencode($cert['certificate_code']);

$format = $_GET['format'] ?? 'html';

if ($format === 'raw_svg') {
    header('Content-Type: image/svg+xml');
    echo PDFService::renderSvgCertificate($cert, $verificationUrl);
    exit;
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate — <?= Utils::e($cert['recipient_name']) ?></title>
  <style>
    body {
      margin: 0;
      padding: 2rem;
      background: #334155;
      display: flex;
      flex-direction: column;
      align-items: center;
      font-family: -apple-system, sans-serif;
    }
    .print-controls {
      margin-bottom: 1.5rem;
      display: flex;
      gap: 1rem;
    }
    .btn {
      background: #2563eb;
      color: white;
      padding: 0.6rem 1.2rem;
      border-radius: 6px;
      font-weight: 600;
      text-decoration: none;
      border: none;
      cursor: pointer;
    }
    .btn-white {
      background: white;
      color: #0f172a;
    }
    .cert-frame {
      background: white;
      border-radius: 12px;
      padding: 1rem;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);
      max-width: 980px;
      width: 100%;
    }
    @media print {
      body { background: white; padding: 0; }
      .print-controls { display: none; }
      .cert-frame { box-shadow: none; border-radius: 0; padding: 0; }
    }
  </style>
</head>
<body>

<div class="print-controls">
  <button onclick="window.print()" class="btn btn-white">🖨️ Print Certificate</button>
  <a href="/certificate.php?id=<?= urlencode($identifier) ?>&format=raw_svg" download="Certificate_<?= urlencode($cert['certificate_code']) ?>.svg" class="btn">
    💾 Download SVG File
  </a>
  <a href="/verify.php?id=<?= urlencode($cert['certificate_code']) ?>" class="btn" style="background:#0f172a;">
    🔍 Open Verification Page
  </a>
</div>

<div class="cert-frame">
  <?= PDFService::renderSvgCertificate($cert, $verificationUrl) ?>
</div>

</body>
</html>
