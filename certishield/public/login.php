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

// Redirect if already logged in
$currentUser = Auth::getCurrentUser();
if ($currentUser) {
    if ($currentUser['role'] === 'admin') {
        header('Location: /admin.php');
        exit;
    }
    header('Location: /dashboard.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    Security::requireCsrf();

    $email = trim((string)($_POST['email'] ?? ''));
    $password = (string)($_POST['password'] ?? '');

    try {
        $user = Auth::login($pdo, $email, $password);
        if ($user['role'] === 'admin') {
            header('Location: /admin.php');
            exit;
        }
        header('Location: /dashboard.php');
        exit;
    } catch (\Throwable $e) {
        $error = $e->getMessage();
    }
}

$pageTitle = 'Sign In | CertiShield';
require_once __DIR__ . '/header.php';
?>

<div class="container" style="max-width: 480px; margin-top: 3rem;">
  <div class="card">
    <h1 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem; text-align: center;">
      Organizer &amp; Admin Sign In
    </h1>
    <p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; margin-bottom: 1.5rem;">
      Access your event hub or campus administrative console.
    </p>

    <?php if ($error): ?>
      <div class="alert alert-error">
        <span>⚠️</span>
        <div><?= Utils::e($error) ?></div>
      </div>
    <?php endif; ?>

    <form method="POST" action="/login.php">
      <?= Security::csrfField() ?>

      <div class="form-group">
        <label for="email">Institutional Email Address</label>
        <input 
          type="email" 
          name="email" 
          id="email" 
          class="form-control" 
          placeholder="e.g. acm@studentchapter.edu" 
          value="<?= Utils::e($_POST['email'] ?? '') ?>" 
          required 
          autocomplete="username"
        >
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input 
          type="password" 
          name="password" 
          id="password" 
          class="form-control" 
          placeholder="••••••••" 
          required 
          autocomplete="current-password"
        >
      </div>

      <button type="submit" class="btn" style="width: 100%; margin-top: 0.5rem;">
        Sign In to Portal
      </button>
    </form>

    <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border); font-size: 0.88rem; text-align: center;">
      <p style="color: var(--text-muted);">
        Need to register a university club or society? 
        <a href="/register.php" style="font-weight: 600;">Register Here</a>
      </p>
    </div>

    <!-- Quick Demo Accounts Box for Judges -->
    <div style="margin-top: 1.25rem; background: var(--neutral-bg); padding: 0.85rem; border-radius: 8px; font-size: 0.8rem; color: #475569;">
      <strong>Judge Quick Logins:</strong>
      <div style="margin-top: 0.3rem;">
        <code>admin@certishield.edu</code> / <code>Admin@CertiShield2026</code> (Admin)
      </div>
      <div>
        <code>acm@studentchapter.edu</code> / <code>Organizer@ACM2026</code> (Approved Org)
      </div>
      <div>
        <code>robotics@campus.edu</code> / <code>Pending@Robot2026</code> (Pending Org)
      </div>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/footer.php'; ?>
