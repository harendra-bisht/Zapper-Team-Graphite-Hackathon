<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/Utils.php';
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/Security.php';
require_once __DIR__ . '/../src/Auth.php';

use CertiShield\Database;
use CertiShield\Auth;
use CertiShield\Security;
use CertiShield\Utils;

$pdo = Database::getConnection();

// Requires platform administrator role
$admin = Auth::requireRole('admin');

$error = '';
$success = '';

// Handle Status Changes (Approve / Suspend)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'update_organizer_status') {
    Security::requireCsrf();

    $targetUserId = (int)($_POST['target_user_id'] ?? 0);
    $newStatus = (string)($_POST['new_status'] ?? '');

    if (in_array($newStatus, ['approved', 'suspended', 'pending'], true)) {
        try {
            $upd = $pdo->prepare("UPDATE users SET status = :status WHERE id = :id AND role = 'organizer'");
            $upd->execute(['status' => $newStatus, 'id' => $targetUserId]);

            Auth::logAudit($pdo, $admin['id'], 'admin_update_status', 'users', (string)$targetUserId, "Organizer status updated to {$newStatus}");
            $success = "Organizer account status updated to: " . ucfirst($newStatus);
        } catch (\Throwable $e) {
            $error = $e->getMessage();
        }
    }
}

// Fetch All Organizers
$orgsStmt = $pdo->query("
    SELECT u.*, 
           COUNT(DISTINCT e.id) as event_count,
           COUNT(c.id) as certificate_count
    FROM users u
    LEFT JOIN events e ON u.id = e.user_id
    LEFT JOIN certificates c ON e.id = c.event_id
    WHERE u.role = 'organizer'
    GROUP BY u.id
    ORDER BY u.created_at DESC
");
$organizers = $orgsStmt->fetchAll();

// Fetch System Audit Log
$auditStmt = $pdo->query("
    SELECT a.*, u.full_name, u.organization_name
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT 25
");
$auditLogs = $auditStmt->fetchAll();

$pageTitle = 'Institutional Admin Panel | CertiShield';
require_once __DIR__ . '/header.php';
?>

<div class="container">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.85rem; font-weight: 800; color: var(--text-main);">
        Institutional Administration Console
      </h1>
      <p style="color: var(--text-muted); font-size: 0.92rem;">
        Vetting authority for campus clubs, student chapters, and credential fraud oversight.
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

  <!-- Organizers Management Card -->
  <div class="card" style="margin-bottom: 2rem;">
    <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
      Event Organizers &amp; Vetting Status (<?= count($organizers) ?>)
    </h2>

    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Organization</th>
            <th>Lead Contact</th>
            <th>Contact Info</th>
            <th>Events / Certs</th>
            <th>Status</th>
            <th>Vetting Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($organizers as $org): ?>
            <tr>
              <td>
                <strong><?= Utils::e($org['organization_name']) ?></strong>
                <?php if ($org['institution_website']): ?>
                  <div style="font-size: 0.78rem;">
                    <a href="<?= Utils::e($org['institution_website']) ?>" target="_blank" rel="noopener">Website &nearr;</a>
                  </div>
                <?php endif; ?>
              </td>
              <td><?= Utils::e($org['full_name']) ?></td>
              <td>
                <div style="font-size: 0.85rem;"><?= Utils::e($org['email']) ?></div>
                <div style="font-size: 0.78rem; color: #64748b;"><?= Utils::e($org['contact_phone'] ?: 'No phone') ?></div>
              </td>
              <td>
                <?= (int)$org['event_count'] ?> events &bull; <?= (int)$org['certificate_count'] ?> certs
              </td>
              <td>
                <?php if ($org['status'] === 'approved'): ?>
                  <span class="badge badge-approved">Approved</span>
                <?php elseif ($org['status'] === 'pending'): ?>
                  <span class="badge badge-pending">Pending Review</span>
                <?php else: ?>
                  <span class="badge badge-revoked">Suspended</span>
                <?php endif; ?>
              </td>
              <td>
                <form method="POST" action="/admin.php" style="display: flex; gap: 0.4rem;">
                  <?= Security::csrfField() ?>
                  <input type="hidden" name="action" value="update_organizer_status">
                  <input type="hidden" name="target_user_id" value="<?= (int)$org['id'] ?>">

                  <?php if ($org['status'] !== 'approved'): ?>
                    <button type="submit" name="new_status" value="approved" class="btn btn-sm" style="background: #16a34a;">
                      Approve
                    </button>
                  <?php endif; ?>

                  <?php if ($org['status'] !== 'suspended'): ?>
                    <button type="submit" name="new_status" value="suspended" class="btn btn-sm btn-danger">
                      Suspend
                    </button>
                  <?php endif; ?>

                  <?php if ($org['status'] === 'suspended'): ?>
                    <button type="submit" name="new_status" value="approved" class="btn btn-sm btn-secondary">
                      Reinstate
                    </button>
                  <?php endif; ?>
                </form>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Audit Trail Card -->
  <div class="card">
    <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
      Platform Security &amp; Operations Audit Trail
    </h2>

    <div class="table-responsive">
      <table class="table" style="font-size: 0.85rem;">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Action</th>
            <th>Actor</th>
            <th>Target Type / ID</th>
            <th>IP Address</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($auditLogs as $log): ?>
            <tr>
              <td style="white-space: nowrap;"><?= Utils::e($log['created_at']) ?></td>
              <td><code><?= Utils::e($log['action']) ?></code></td>
              <td><?= Utils::e($log['full_name'] ? "{$log['full_name']} ({$log['organization_name']})" : 'System / Guest') ?></td>
              <td><?= Utils::e("{$log['target_type']} #{$log['target_id']}") ?></td>
              <td><code><?= Utils::e($log['ip_address']) ?></code></td>
              <td><?= Utils::e($log['details']) ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/footer.php'; ?>
