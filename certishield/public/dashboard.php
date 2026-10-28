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

// Requires approved organizer role
$user = Auth::requireApprovedOrganizer($pdo);

$error = '';
$success = '';

// Handle Create Event
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'create_event') {
    Security::requireCsrf();

    $title = trim((string)($_POST['title'] ?? ''));
    $category = trim((string)($_POST['category'] ?? 'Hackathon'));
    $eventDate = (string)($_POST['event_date'] ?? date('Y-m-d'));
    $venue = trim((string)($_POST['venue'] ?? 'Campus'));
    $desc = trim((string)($_POST['description'] ?? ''));

    try {
        CertificateService::createEvent($pdo, $user['id'], $title, $category, $eventDate, $venue, $desc);
        $success = "Event '{$title}' created successfully!";
    } catch (\Throwable $e) {
        $error = $e->getMessage();
    }
}

// Fetch Organizer's Events
$stmt = $pdo->prepare("
    SELECT e.*, 
           COUNT(c.id) as total_certs,
           SUM(CASE WHEN c.status = 'active' THEN 1 ELSE 0 END) as active_certs,
           SUM(CASE WHEN c.status = 'revoked' THEN 1 ELSE 0 END) as revoked_certs
    FROM events e
    LEFT JOIN certificates c ON e.id = c.event_id
    WHERE e.user_id = :user_id
    GROUP BY e.id
    ORDER BY e.created_at DESC
");
$stmt->execute(['user_id' => $user['id']]);
$events = $stmt->fetchAll();

// Overall Stats for Organizer
$statStmt = $pdo->prepare("
    SELECT 
        COUNT(DISTINCT e.id) as total_events,
        COUNT(c.id) as total_issued,
        SUM(CASE WHEN c.status = 'active' THEN 1 ELSE 0 END) as total_active,
        SUM(CASE WHEN c.status = 'revoked' THEN 1 ELSE 0 END) as total_revoked
    FROM events e
    LEFT JOIN certificates c ON e.id = c.event_id
    WHERE e.user_id = :user_id
");
$statStmt->execute(['user_id' => $user['id']]);
$stats = $statStmt->fetch();

$pageTitle = 'Organizer Event Hub | CertiShield';
require_once __DIR__ . '/header.php';
?>

<div class="container">
  <!-- Hub Header -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.85rem; font-weight: 800; color: var(--text-main);">
        <?= Utils::e($user['organization_name']) ?> Hub
      </h1>
      <p style="color: var(--text-muted); font-size: 0.92rem;">
        Authorized Institutional Issuer Portal &bull; Status: <span class="badge badge-approved">Approved</span>
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

  <!-- Stats Grid -->
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
    <div class="card" style="margin-bottom: 0;">
      <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600;">Managed Events</div>
      <div style="font-size: 1.85rem; font-weight: 800; color: var(--text-main); margin-top: 0.2rem;">
        <?= (int)($stats['total_events'] ?? 0) ?>
      </div>
    </div>

    <div class="card" style="margin-bottom: 0;">
      <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600;">Total Issued Credentials</div>
      <div style="font-size: 1.85rem; font-weight: 800; color: var(--primary); margin-top: 0.2rem;">
        <?= (int)($stats['total_issued'] ?? 0) ?>
      </div>
    </div>

    <div class="card" style="margin-bottom: 0;">
      <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600;">Active &amp; Verified</div>
      <div style="font-size: 1.85rem; font-weight: 800; color: var(--success); margin-top: 0.2rem;">
        <?= (int)($stats['total_active'] ?? 0) ?>
      </div>
    </div>

    <div class="card" style="margin-bottom: 0;">
      <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600;">Revoked Credentials</div>
      <div style="font-size: 1.85rem; font-weight: 800; color: var(--danger); margin-top: 0.2rem;">
        <?= (int)($stats['total_revoked'] ?? 0) ?>
      </div>
    </div>
  </div>

  <div class="grid-2">
    <!-- Events List Card -->
    <div>
      <div class="card">
        <h2 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
          Your Authorized Events
        </h2>

        <?php if (empty($events)): ?>
          <p style="color: var(--text-muted); font-size: 0.9rem;">
            No events created yet. Use the form to launch your first event.
          </p>
        <?php else: ?>
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <?php foreach ($events as $ev): ?>
              <div style="border: 1px solid var(--border); border-radius: 8px; padding: 1rem; background: var(--bg-card);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem;">
                  <h3 style="font-size: 1.05rem; font-weight: 700;">
                    <a href="/event.php?id=<?= (int)$ev['id'] ?>"><?= Utils::e($ev['title']) ?></a>
                  </h3>
                  <span class="badge badge-active"><?= Utils::e($ev['category']) ?></span>
                </div>
                <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.6rem;">
                  Date: <?= Utils::e($ev['event_date']) ?> &bull; Venue: <?= Utils::e($ev['venue']) ?>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 0.6rem; font-size: 0.85rem;">
                  <div>
                    Certificates: <strong><?= (int)$ev['total_certs'] ?></strong> 
                    (<span style="color: var(--success);"><?= (int)$ev['active_certs'] ?> active</span>, 
                    <span style="color: var(--danger);"><?= (int)$ev['revoked_certs'] ?> revoked</span>)
                  </div>
                  <a href="/event.php?id=<?= (int)$ev['id'] ?>" class="btn btn-sm">
                    Manage &amp; Issue &rarr;
                  </a>
                </div>
              </div>
            <?php endforeach; ?>
          </div>
        <?php endif; ?>
      </div>
    </div>

    <!-- Create Event Card -->
    <div>
      <div class="card">
        <h2 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
          Create New Event
        </h2>

        <form method="POST" action="/dashboard.php">
          <?= Security::csrfField() ?>
          <input type="hidden" name="action" value="create_event">

          <div class="form-group">
            <label for="title">Event Title *</label>
            <input 
              type="text" 
              name="title" 
              id="title" 
              class="form-control" 
              placeholder="e.g. GRAPHITE 26 Hackathon" 
              required
            >
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label for="category">Category</label>
              <select name="category" id="category" class="form-control">
                <option value="Hackathon">Hackathon</option>
                <option value="Conference">Conference</option>
                <option value="Workshop">Workshop</option>
                <option value="Symposium">Symposium</option>
                <option value="Competition">Competition</option>
              </select>
            </div>

            <div class="form-group">
              <label for="event_date">Event Date *</label>
              <input 
                type="date" 
                name="event_date" 
                id="event_date" 
                class="form-control" 
                value="<?= date('Y-m-d') ?>" 
                required
              >
            </div>
          </div>

          <div class="form-group">
            <label for="venue">Event Venue / Location *</label>
            <input 
              type="text" 
              name="venue" 
              id="venue" 
              class="form-control" 
              placeholder="e.g. Campus Tech Auditorium" 
              required
            >
          </div>

          <div class="form-group">
            <label for="description">Event Description</label>
            <textarea 
              name="description" 
              id="description" 
              class="form-control" 
              rows="3" 
              placeholder="Brief summary of event guidelines..."
            ></textarea>
          </div>

          <button type="submit" class="btn" style="width: 100%;">
            Create Event &amp; Open Issuance Hub
          </button>
        </form>
      </div>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/footer.php'; ?>
