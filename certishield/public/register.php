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

$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    Security::requireCsrf();

    $fullName = trim((string)($_POST['full_name'] ?? ''));
    $email = trim((string)($_POST['email'] ?? ''));
    $password = (string)($_POST['password'] ?? '');
    $orgName = trim((string)($_POST['organization_name'] ?? ''));
    $phone = trim((string)($_POST['phone'] ?? ''));
    $website = trim((string)($_POST['website'] ?? ''));

    try {
        Auth::registerOrganizer($pdo, $fullName, $email, $password, $orgName, $phone, $website);
        $success = "Registration successful! Your club account has been submitted for university administrator vetting. You can log in once approved.";
    } catch (\Throwable $e) {
        $error = $e->getMessage();
    }
}

$pageTitle = 'Register Club / Society | CertiShield';
require_once __DIR__ . '/header.php';
?>

<div class="container" style="max-width: 580px; margin-top: 2rem;">
  <div class="card">
    <h1 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem; text-align: center;">
      Register Event Organizer Account
    </h1>
    <p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; margin-bottom: 1.5rem;">
      College clubs, academic departments, and hackathon teams must be vetted by platform administrators before certificate issuance rights are granted.
    </p>

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
      <div style="text-align: center; margin-top: 1rem;">
        <a href="/login.php" class="btn">Proceed to Sign In</a>
      </div>
    <?php else: ?>

      <form method="POST" action="/register.php">
        <?= Security::csrfField() ?>

        <div class="form-group">
          <label for="organization_name">Organization / Club / Society Name *</label>
          <input 
            type="text" 
            name="organization_name" 
            id="organization_name" 
            class="form-control" 
            placeholder="e.g. IEEE Student Branch or CyberSec Club" 
            value="<?= Utils::e($_POST['organization_name'] ?? '') ?>" 
            required
          >
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label for="full_name">Lead Organizer Full Name *</label>
            <input 
              type="text" 
              name="full_name" 
              id="full_name" 
              class="form-control" 
              placeholder="e.g. Rahul Verma" 
              value="<?= Utils::e($_POST['full_name'] ?? '') ?>" 
              required
            >
          </div>

          <div class="form-group">
            <label for="email">Institutional Email Address *</label>
            <input 
              type="email" 
              name="email" 
              id="email" 
              class="form-control" 
              placeholder="e.g. rahul@campus.edu" 
              value="<?= Utils::e($_POST['email'] ?? '') ?>" 
              required
            >
          </div>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label for="phone">Contact Phone</label>
            <input 
              type="tel" 
              name="phone" 
              id="phone" 
              class="form-control" 
              placeholder="+91 9876543210" 
              value="<?= Utils::e($_POST['phone'] ?? '') ?>"
            >
          </div>

          <div class="form-group">
            <label for="website">Club Website / Portal URL</label>
            <input 
              type="url" 
              name="website" 
              id="website" 
              class="form-control" 
              placeholder="https://ieee.campus.edu" 
              value="<?= Utils::e($_POST['website'] ?? '') ?>"
            >
          </div>
        </div>

        <div class="form-group">
          <label for="password">Password (Minimum 8 Characters) *</label>
          <input 
            type="password" 
            name="password" 
            id="password" 
            class="form-control" 
            placeholder="••••••••" 
            required 
            minlength="8"
          >
        </div>

        <button type="submit" class="btn" style="width: 100%; margin-top: 0.5rem;">
          Submit Application for Approval
        </button>
      </form>

      <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border); font-size: 0.88rem; text-align: center;">
        <p style="color: var(--text-muted);">
          Already registered? <a href="/login.php">Sign In Here</a>
        </p>
      </div>

    <?php endif; ?>
  </div>
</div>

<?php require_once __DIR__ . '/footer.php'; ?>
