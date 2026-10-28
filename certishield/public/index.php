<?php
declare(strict_types=1);

$pageTitle = 'CertiShield — Certificate Authenticity Verifier';
require_once __DIR__ . '/header.php';
?>

<div class="container">
  <!-- Hero Section -->
  <div class="card" style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; border: none; padding: 3rem 2rem; border-radius: 16px; margin-bottom: 2.5rem; text-align: center;">
    <div style="display: inline-block; background: rgba(255,255,255,0.15); padding: 0.35rem 1rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 700; margin-bottom: 1rem; letter-spacing: 0.05em;">
      GRAPHITE 26 &bull; PROBLEM STATEMENT 13
    </div>
    <h1 style="font-size: 2.5rem; font-weight: 800; line-height: 1.2; margin-bottom: 1rem;">
      Trustworthy Certificate Authenticity &amp; Tamper Verification
    </h1>
    <p style="font-size: 1.15rem; color: #bfdbfe; max-width: 680px; margin: 0 auto 2rem auto;">
      Instant QR validation, institutional authority verification, and bit-level file integrity diagnostics. Eliminates fake credentials and event gate crashes.
    </p>
    <div style="display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap;">
      <a href="/verify.php" class="btn" style="background: white; color: #1e3a8a; font-weight: 700; padding: 0.8rem 1.6rem; font-size: 1.05rem;">
        🔍 Launch Public Verifier
      </a>
      <a href="/login.php" class="btn btn-secondary" style="background: rgba(255,255,255,0.1); color: white; border-color: rgba(255,255,255,0.3); padding: 0.8rem 1.6rem;">
        Organizer Portal
      </a>
    </div>
  </div>

  <!-- 3 Key Pillars of PS 13 -->
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 3rem;">
    <div class="card">
      <div style="font-size: 2rem; margin-bottom: 0.8rem;">⚡</div>
      <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem;">Instant Public Verification</h3>
      <p style="color: var(--text-muted); font-size: 0.92rem;">
        Scanners or gatekeepers verify credentials via unique high-entropy QR codes or 12-character IDs with zero login required. Resolves in &lt;10ms.
      </p>
    </div>

    <div class="card">
      <div style="font-size: 2rem; margin-bottom: 0.8rem;">🛡️</div>
      <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem;">Dual-Vector Tamper Proof</h3>
      <p style="color: var(--text-muted); font-size: 0.92rem;">
        Goes beyond generic QR links: Compares bit-level SHA-256 document hashes to catch Photoshop alterations where student names are modified on genuine PDFs.
      </p>
    </div>

    <div class="card">
      <div style="font-size: 2rem; margin-bottom: 0.8rem;">🏛️</div>
      <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem;">Institutional Trust Chain</h3>
      <p style="color: var(--text-muted); font-size: 0.92rem;">
        Organizers must be vetted by university administrators before issuing certificates. Real-time immediate revocation locks out compromised records instantly.
      </p>
    </div>
  </div>

  <!-- Live Judge Quick Scenarios Table -->
  <div class="card">
    <h2 style="font-size: 1.35rem; font-weight: 700; margin-bottom: 1rem;">
      🧪 Quick Benchmark Test Matrix (Evaluation Sandbox)
    </h2>
    <p style="color: var(--text-muted); font-size: 0.92rem; margin-bottom: 1.2rem;">
      Use the pre-seeded synthetic fixtures below to evaluate all 5 real-world verification states in real time:
    </p>

    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Scenario / State</th>
            <th>Synthetic Subject</th>
            <th>Certificate ID</th>
            <th>Expected Server Verdict</th>
            <th>Live Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>1. Genuine Certificate</strong></td>
            <td>Aryan Sharma (1st Place AI Track)</td>
            <td><code>GPH-26-8F29A</code></td>
            <td><span class="badge badge-active">VERIFIED</span></td>
            <td><a href="/verify.php?id=GPH-26-8F29A" class="btn btn-sm">Inspect Real Scan</a></td>
          </tr>
          <tr>
            <td><strong>2. Revoked Credential</strong></td>
            <td>Dev Patel (Disqualified Plagiarism)</td>
            <td><code>GPH-26-REVOK</code></td>
            <td><span class="badge badge-revoked">REVOKED</span></td>
            <td><a href="/verify.php?id=GPH-26-REVOK" class="btn btn-sm btn-danger">Inspect Revocation</a></td>
          </tr>
          <tr>
            <td><strong>3. Expired Credential</strong></td>
            <td>Priya Nair (Volunteer Term 2025)</td>
            <td><code>GPH-25-EXPIR</code></td>
            <td><span class="badge badge-pending">EXPIRED</span></td>
            <td><a href="/verify.php?id=GPH-25-EXPIR" class="btn btn-sm btn-secondary">Inspect Expiry</a></td>
          </tr>
          <tr>
            <td><strong>4. Not Found / Forged ID</strong></td>
            <td>Unregistered Crash Candidate</td>
            <td><code>GPH-26-FAKE99</code></td>
            <td><span class="badge" style="background:#e2e8f0; color:#475569;">NOT FOUND</span></td>
            <td><a href="/verify.php?id=GPH-26-FAKE99" class="btn btn-sm btn-secondary">Inspect Lookup</a></td>
          </tr>
          <tr>
            <td><strong>5. File Tamper Mismatch</strong></td>
            <td>Aryan Sharma (Name Edited to John Doe)</td>
            <td><code>GPH-26-8F29A</code></td>
            <td><span class="badge badge-revoked">TAMPERED</span></td>
            <td><a href="/verify.php?id=GPH-26-8F29A&demo_tamper=1" class="btn btn-sm btn-danger">Trigger Tamper Check</a></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/footer.php'; ?>
