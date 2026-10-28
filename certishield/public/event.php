<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/Utils.php';
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/Security.php';
require_once __DIR__ . '/../src/Auth.php';
require_once __DIR__ . '/../src/CertificateService.php';

use CertiShield\Database;
use CertiShield\Auth;
use CertiShield\Security;
use CertiShield\CertificateService;
use CertiShield\Utils;

$pdo = Database::getConnection();
$user = Auth::requireApprovedOrganizer($pdo);

$eventId = (int)($_GET['id'] ?? 0);
if ($eventId <= 0) {
    header('Location: /dashboard.php');
    exit;
}

// Ownership check: Default-deny across organizers
$event = null;
try {
    $event = CertificateService::assertEventOwnership($pdo, $user['id'], $eventId);
} catch (\Throwable $e) {
    http_response_code(403);
    die("Access Denied: " . Utils::e($e->getMessage()));
}

$error = '';
$success = '';

// Handle Single Certificate Issuance
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'issue_single') {
    Security::requireCsrf();

    $name = trim((string)($_POST['recipient_name'] ?? ''));
    $email = trim((string)($_POST['recipient_email'] ?? ''));
    $rollNo = trim((string)($_POST['recipient_identifier'] ?? ''));
    $role = trim((string)($_POST['role'] ?? 'Participant'));

    try {
        $cert = CertificateService::issueCertificate($pdo, $user['id'], $eventId, $name, $email, $rollNo, $role);
        $success = "Certificate successfully issued! Unique Code: {$cert['certificate_code']}";
    } catch (\Throwable $e) {
        $error = $e->getMessage();
    }
}

// Handle Batch CSV Issuance
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'issue_csv') {
    Security::requireCsrf();

    $csvContent = '';
    if (!empty($_FILES['csv_file']['tmp_name'])) {
        $csvContent = file_get_contents($_FILES['csv_file']['tmp_name']);
    } elseif (!empty($_POST['csv_text'])) {
        $csvContent = (string)$_POST['csv_text'];
    }

    try {
        $issued = CertificateService::batchIssueFromCsv($pdo, $user['id'], $eventId, $csvContent);
        $count = count($issued);
        $success = "Batch processing complete! {$count} certificates generated with unique cryptographic tokens.";
    } catch (\Throwable $e) {
        $error = $e->getMessage();
    }
}

// Handle Revocation
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'revoke_cert') {
    Security::requireCsrf();

    $certId = (int)($_POST['certificate_id'] ?? 0);
    $reason = trim((string)($_POST['reason'] ?? ''));

    try {
        CertificateService::revokeCertificate($pdo, $user['id'], $certId, $reason);
        $success = "Certificate was immediately revoked and flagged in the registry!";
    } catch (\Throwable $e) {
        $error = $e->getMessage();
    }
}

// Fetch All Issued Certificates for this Event
$certStmt = $pdo->prepare("
    SELECT * FROM certificates 
    WHERE event_id = :event_id 
    ORDER BY created_at DESC
");
$certStmt->execute(['event_id' => $eventId]);
$certificates = $certStmt->fetchAll();

$pageTitle = Utils::e($event['title']) . ' | Event Hub';
require_once __DIR__ . '/header.php';
?>

<div class="container">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">
        <a href="/dashboard.php">&larr; Back to Events</a>
      </div>
      <h1 style="font-size: 1.85rem; font-weight: 800; color: var(--text-main);">
        <?= Utils::e($event['title']) ?>
      </h1>
      <p style="color: var(--text-muted); font-size: 0.9rem;">
        Event Date: <?= Utils::e($event['event_date']) ?> &bull; Venue: <?= Utils::e($event['venue']) ?> &bull; Category: <?= Utils::e($event['category']) ?>
      </p>
    </div>
  </div>

  <?php if ($error): ?>
    <div class="alert alert-error">
      <span>⚠️</span>
      <div><?= Utils::e($error) ?></div>
    </div>
  <?php endif; ?>

  <?php if ($success): ?>
    <div class="alert alert-success">
      <span>✅</span>
      <div><?= Utils::e($success) ?></div>
    </div>
  <?php endif; ?>

  <div class="grid-2" style="margin-bottom: 2rem;">
    <!-- Single Issuance Form -->
    <div class="card" style="margin-bottom: 0;">
      <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
        Issue Single Certificate
      </h2>

      <form method="POST" action="/event.php?id=<?= $eventId ?>">
        <?= Security::csrfField() ?>
        <input type="hidden" name="action" value="issue_single">

        <div class="form-group">
          <label for="recipient_name">Participant Full Name *</label>
          <input type="text" name="recipient_name" id="recipient_name" class="form-control" placeholder="e.g. John Doe" required>
        </div>

        <div class="form-group">
          <label for="recipient_email">Participant Email *</label>
          <input type="email" name="recipient_email" id="recipient_email" class="form-control" placeholder="john@example.edu" required>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label for="recipient_identifier">Roll No / ID (Optional)</label>
            <input type="text" name="recipient_identifier" id="recipient_identifier" class="form-control" placeholder="ROLL-2026-101">
          </div>

          <div class="form-group">
            <label for="role">Role / Award</label>
            <select name="role" id="role" class="form-control">
              <option value="Participant">Participant</option>
              <option value="1st Place Winner">1st Place Winner</option>
              <option value="Runner Up">Runner Up</option>
              <option value="Best Innovation">Best Innovation</option>
              <option value="Volunteer">Volunteer</option>
            </select>
          </div>
        </div>

        <button type="submit" class="btn" style="width: 100%;">
          Generate &amp; Issue Certificate
        </button>
      </form>
    </div>

    <!-- Batch CSV Issuance Form -->
    <div class="card" style="margin-bottom: 0;">
      <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
        Bulk Issue via CSV
      </h2>

      <form method="POST" action="/event.php?id=<?= $eventId ?>" enctype="multipart/form-data">
        <?= Security::csrfField() ?>
        <input type="hidden" name="action" value="issue_csv">

        <div class="form-group">
          <label for="csv_file">Upload CSV File</label>
          <input type="file" name="csv_file" id="csv_file" accept=".csv" class="form-control" style="font-size: 0.85rem;">
        </div>

        <div class="form-group">
          <label for="csv_text">Or Paste CSV Text (Columns: <code>name,email,role,roll_no</code>)</label>
          <textarea name="csv_text" id="csv_text" class="form-control" rows="4" placeholder="name,email,role,roll_no
Aman Gupta,aman@college.edu,Participant,ROLL-401
Simran Kaur,simran@college.edu,Runner Up,ROLL-402"></textarea>
        </div>

        <button type="submit" class="btn btn-secondary" style="width: 100%;">
          Process Bulk CSV Issuance
        </button>
      </form>
    </div>
  </div>

  <!-- Issued Certificates Roster -->
  <div class="card">
    <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
      Issued Credentials Roster (<?= count($certificates) ?>)
    </h2>

    <?php if (empty($certificates)): ?>
      <p style="color: var(--text-muted); font-size: 0.9rem;">
        No certificates issued for this event yet.
      </p>
    <?php else: ?>
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Certificate ID</th>
              <th>Recipient</th>
              <th>Role</th>
              <th>Issued</th>
              <th>Status</th>
              <th>Verification Link</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($certificates as $cert): ?>
              <tr>
                <td>
                  <strong style="font-family: monospace;"><?= Utils::e($cert['certificate_code']) ?></strong>
                </td>
                <td>
                  <div style="font-weight: 600;"><?= Utils::e($cert['recipient_name']) ?></div>
                  <div style="font-size: 0.78rem; color: #64748b;"><?= Utils::e($cert['recipient_email']) ?></div>
                </td>
                <td><?= Utils::e($cert['participation_role']) ?></td>
                <td><?= Utils::e($cert['issue_date']) ?></td>
                <td>
                  <?php if ($cert['status'] === 'active'): ?>
                    <span class="badge badge-active">Active</span>
                  <?php else: ?>
                    <span class="badge badge-revoked">Revoked</span>
                  <?php endif; ?>
                </td>
                <td>
                  <a href="/verify.php?id=<?= urlencode($cert['certificate_code']) ?>" target="_blank" style="font-size: 0.82rem;">
                    🔍 Test Scan
                  </a>
                  &bull;
                  <a href="/certificate.php?id=<?= urlencode($cert['certificate_code']) ?>" target="_blank" style="font-size: 0.82rem;">
                    🖨️ PDF
                  </a>
                </td>
                <td>
                  <?php if ($cert['status'] === 'active'): ?>
                    <!-- Inline Revocation Trigger with Prompt -->
                    <form method="POST" action="/event.php?id=<?= $eventId ?>" style="display: inline;" onsubmit="return confirmRevocation(this);">
                      <?= Security::csrfField() ?>
                      <input type="hidden" name="action" value="revoke_cert">
                      <input type="hidden" name="certificate_id" value="<?= (int)$cert['id'] ?>">
                      <input type="hidden" name="reason" value="Issued in error / disqualified">
                      <button type="submit" class="btn btn-sm btn-danger">
                        Revoke
                      </button>
                    </form>
                  <?php else: ?>
                    <span style="font-size: 0.78rem; color: #dc2626;" title="<?= Utils::e($cert['revocation_reason']) ?>">
                      <?= Utils::e($cert['revocation_reason'] ?: 'Revoked') ?>
                    </span>
                  <?php endif; ?>
                </td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    <?php endif; ?>
  </div>
</div>

<script>
function confirmRevocation(form) {
  const reason = prompt("Enter the official reason for revoking this certificate:", "Issued by mistake / disqualified for code violation");
  if (reason && reason.trim() !== "") {
    form.querySelector('input[name="reason"]').value = reason.trim();
    return true;
  }
  return false;
}
</script>

<?php require_once __DIR__ . '/footer.php'; ?>
