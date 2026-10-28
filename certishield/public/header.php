<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/Utils.php';
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/Security.php';
require_once __DIR__ . '/../src/Auth.php';

use CertiShield\Auth;
use CertiShield\Utils;

$currentUser = Auth::getCurrentUser();
$pageTitle = $pageTitle ?? 'CertiShield — Certificate Authenticity Verifier';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= Utils::e($pageTitle) ?></title>
  <link rel="stylesheet" href="/assets/css/app.css">
</head>
<body>

<!-- Judge Live Demo Quick-Switcher -->
<div class="demo-banner">
  <div style="display: flex; align-items: center; gap: 0.5rem;">
    <span class="demo-badge">Judge Demo Quick-Jump</span>
    <span>Problem Statement 13 (PS 13) Live Evaluation</span>
  </div>
  <div class="demo-links">
    <a href="/verify.php?id=GPH-26-8F29A" title="Scenario 1: Verified Genuine">1. Genuine Check</a>
    <a href="/verify.php?id=GPH-26-REVOK" title="Scenario 2: Revoked Credential">2. Revoked Check</a>
    <a href="/verify.php?id=GPH-25-EXPIR" title="Scenario 3: Expired Credential">3. Expired Check</a>
    <a href="/verify.php?id=GPH-26-INVALID" title="Scenario 4: Not Found / Unregistered">4. Not Found Check</a>
    <a href="/verify.php?id=GPH-26-8F29A&demo_tamper=1" title="Scenario 5: Tampered File Mismatch">5. Tamper Diagnostic</a>
  </div>
</div>

<!-- Header Navigation -->
<header class="navbar">
  <a href="/index.php" class="brand">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
    <span>CertiShield</span>
  </a>

  <nav class="nav-links">
    <a href="/index.php">Home</a>
    <a href="/verify.php">Public Verifier</a>
    
    <?php if ($currentUser): ?>
      <?php if ($currentUser['role'] === 'admin'): ?>
        <a href="/admin.php">Admin Panel</a>
      <?php else: ?>
        <a href="/dashboard.php">Organizer Event Hub</a>
      <?php endif; ?>
      <span style="font-size: 0.85rem; color: #64748b;">(<?= Utils::e($currentUser['name']) ?>)</span>
      <a href="/logout.php" style="color: #dc2626;">Log Out</a>
    <?php else: ?>
      <a href="/login.php">Organizer Sign In</a>
      <a href="/register.php" class="btn btn-sm">Register Club</a>
    <?php endif; ?>
  </nav>
</header>
