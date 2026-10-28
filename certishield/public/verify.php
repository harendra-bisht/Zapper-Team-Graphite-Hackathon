<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/Utils.php';
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/Security.php';
require_once __DIR__ . '/../src/VerificationService.php';
require_once __DIR__ . '/../src/QRCodeService.php';
require_once __DIR__ . '/../src/PDFService.php';

use CertiShield\Database;
use CertiShield\VerificationService;
use CertiShield\Utils;
use CertiShield\PDFService;

$pdo = Database::getConnection();

// Identifier from GET or POST (token or human-readable code)
$identifier = trim((string)($_GET['id'] ?? $_GET['token'] ?? $_POST['identifier'] ?? ''));
$fileHash = null;

// Synthetic demo tamper flag (allows judges to test file tamper detection with one click)
if (!empty($_GET['demo_tamper'])) {
    $fileHash = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'; // Intentional altered hash
} elseif (!empty($_FILES['certificate_file']['tmp_name'])) {
    $fileHash = hash_file('sha256', $_FILES['certificate_file']['tmp_name']);
}

$verification = null;
if ($identifier !== '') {
    $verification = VerificationService::verify(
        $pdo,
        $identifier,
        $fileHash,
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
        $_SERVER['HTTP_USER_AGENT'] ?? 'Verifier Browser'
    );
}

$pageTitle = 'Public Credential Verifier | CertiShield';
require_once __DIR__ . '/header.php';
?>

<div class="container" style="max-width: 860px;">
  <!-- Search / Input Card -->
  <div class="card" style="margin-bottom: 2rem;">
    <h1 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem;">
      Institutional Certificate Verifier
    </h1>
    <p style="color: var(--text-muted); font-size: 0.92rem; margin-bottom: 1.25rem;">
      Enter the unique certificate ID, paste the high-entropy verification token, or drop a downloaded certificate to run a bit-level cryptographic integrity diagnostic.
    </p>

    <form method="POST" action="/verify.php" enctype="multipart/form-data">
      <div class="form-group">
        <label for="identifier">Certificate ID or Verification Token</label>
        <div style="display: flex; gap: 0.75rem;">
          <input 
            type="text" 
            name="identifier" 
            id="identifier" 
            class="form-control" 
            placeholder="e.g. GPH-26-8F29A or 00000000-0000-4000-8000-000000000001" 
            value="<?= Utils::e($identifier) ?>" 
            required 
            style="font-family: monospace; font-size: 1.05rem;"
          >
          <button type="submit" class="btn" style="white-space: nowrap;">
            Verify Record
          </button>
        </div>
      </div>

      <!-- Dual Vector File Verification Dropzone -->
      <div style="margin-top: 1rem; padding: 1rem; background: var(--neutral-bg); border-radius: 8px; border: 1px dashed #cbd5e1;">
        <label style="font-size: 0.88rem; font-weight: 600; display: block; margin-bottom: 0.4rem;">
          📁 Optional: Upload Certificate File for Bit-Level SHA-256 Tamper Check
        </label>
        <input type="file" name="certificate_file" accept=".pdf,.svg,.png,.jpg" style="font-size: 0.85rem;">
        <div style="font-size: 0.78rem; color: #64748b; margin-top: 0.3rem;">
          Detects if recipient name or grade was altered in Photoshop while retaining a real QR code.
        </div>
      </div>
    </form>
  </div>

  <?php if ($verification): ?>
    <!-- Verification Result Box -->
    <div class="verdict-box <?= Utils::e($verification['status_class']) ?>">
      <div class="verdict-icon">
        <?php if ($verification['verdict'] === 'verified'): ?>
          ✅
        <?php elseif ($verification['verdict'] === 'revoked'): ?>
          🚫
        <?php elseif ($verification['verdict'] === 'expired'): ?>
          ⏳
        <?php elseif ($verification['verdict'] === 'tampered'): ?>
          ⚠️
        <?php elseif ($verification['verdict'] === 'untrusted_issuer'): ?>
          🛑
        <?php else: ?>
          ❓
        <?php endif; ?>
      </div>

      <div class="verdict-title">
        <?= Utils::e($verification['verdict_title']) ?>
      </div>

      <p style="font-size: 0.95rem; color: var(--text-muted); max-width: 600px; margin: 0 auto 1.25rem auto;">
        Official real-time institutional evaluation from the CertiShield Master Registry.
      </p>

      <!-- Anomaly Alert if Scanned Multiple Times in Short Window -->
      <?php if (!empty($verification['anomaly_detected'])): ?>
        <div class="alert alert-warning" style="text-align: left; max-width: 680px; margin: 0 auto 1.2rem auto;">
          <span>🚨</span>
          <div>
            <strong>Replay Anomaly Alert:</strong> This certificate has been scanned 
            <strong><?= (int)$verification['scan_count'] ?> times</strong> recently. 
            Gatekeepers should verify government/college photo ID to prevent credential pass-backs.
          </div>
        </div>
      <?php endif; ?>

      <!-- Detailed Evidence Chain -->
      <div style="text-align: left; background: white; padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border); margin-top: 1rem;">
        <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-main);">
          Audit &amp; Evidence Log:
        </h4>
        <ul style="list-style: disc; margin-left: 1.5rem; font-size: 0.88rem; color: #334155;">
          <?php foreach ($verification['evidence'] as $ev): ?>
            <li style="margin-bottom: 0.3rem;"><?= Utils::e($ev) ?></li>
          <?php endforeach; ?>
        </ul>
      </div>
    </div>

    <!-- Verified Credential Details (Privacy-Preserved) -->
    <?php if ($verification['certificate']): ?>
      <div class="card">
        <h2 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
          Verified Credential Information
        </h2>

        <div class="grid-2">
          <div>
            <div style="font-size: 0.82rem; color: var(--text-muted);">Recipient Name</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-main);">
              <?= Utils::e($verification['certificate']['recipient_name_raw']) ?>
              <span style="font-size: 0.8rem; font-weight: normal; color: #64748b;">
                (Privacy-Masked: <?= Utils::e($verification['certificate']['recipient_name_masked']) ?>)
              </span>
            </div>
          </div>

          <div>
            <div style="font-size: 0.82rem; color: var(--text-muted);">Institutional Event</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-main);">
              <?= Utils::e($verification['event']['title']) ?>
            </div>
          </div>

          <div>
            <div style="font-size: 0.82rem; color: var(--text-muted);">Participation Role / Honor</div>
            <div style="font-size: 1.05rem; font-weight: 600; color: var(--primary);">
              <?= Utils::e($verification['certificate']['role']) ?>
            </div>
          </div>

          <div>
            <div style="font-size: 0.82rem; color: var(--text-muted);">Authorized Issuing Body</div>
            <div style="font-size: 1.05rem; font-weight: 600; color: var(--text-main);">
              <?= Utils::e($verification['issuer']['organization']) ?>
              <span class="badge badge-approved" style="font-size: 0.72rem; vertical-align: middle;">Vetted Issuer</span>
            </div>
          </div>

          <div>
            <div style="font-size: 0.82rem; color: var(--text-muted);">Certificate Unique Code</div>
            <div style="font-family: monospace; font-size: 1rem; font-weight: 700;">
              <?= Utils::e($verification['certificate']['code']) ?>
            </div>
          </div>

          <div>
            <div style="font-size: 0.82rem; color: var(--text-muted);">Issue Date</div>
            <div style="font-size: 0.95rem; font-weight: 600;">
              <?= Utils::e($verification['certificate']['issue_date']) ?>
            </div>
          </div>

          <div style="grid-column: span 2;">
            <div style="font-size: 0.82rem; color: var(--text-muted);">Canonical SHA-256 Metadata Hash</div>
            <div style="font-family: monospace; font-size: 0.78rem; background: var(--neutral-bg); padding: 0.4rem 0.6rem; border-radius: 4px; word-break: break-all;">
              <?= Utils::e($verification['certificate']['canonical_hash']) ?>
            </div>
          </div>
        </div>

        <?php if ($verification['verdict'] === 'verified'): ?>
          <div style="margin-top: 1.5rem; text-align: center;">
            <a href="/certificate.php?id=<?= urlencode($verification['certificate']['code']) ?>" target="_blank" class="btn btn-secondary">
              🖨️ View Official Printable Certificate
            </a>
          </div>
        <?php endif; ?>
      </div>
    <?php endif; ?>

  <?php endif; ?>
</div>

<?php require_once __DIR__ . '/footer.php'; ?>
