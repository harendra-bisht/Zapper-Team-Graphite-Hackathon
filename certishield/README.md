# CertiShield — Certificate Authenticity Verifier
**Competition:** GRAPHITE 26 &bull; **Problem Statement 13 (PS 13)**  
**Working Title:** CertiShield  
**Core Stack:** PHP 8.1+, MySQL 8.0+ / MariaDB 10.4+, Vanilla Responsive HTML5/CSS3/JavaScript.

---

## 1. Executive Summary & Problem Addressed

College events, hackathons, and symposiums are frequently targeted by bad actors who present fabricated certificates to claim attendance credit, scholarships, or recruitment consideration. Traditional approaches fail because gatekeepers either rely on visual inspection of PDFs or scan generic QR codes that link to unvetted static websites.

**CertiShield** delivers a high-assurance institutional verification platform that solves the exact problem statement without fake tech (no fake AI, no unneeded blockchain):
1. **Institutional Trust Hierarchy:** Organizers must be vetted by university administrators before receiving issuance authority.
2. **Deterministic Multi-Tenancy:** Events and issued credentials are mathematically bound to authorized organizers, strictly preventing IDOR or cross-event spoofing.
3. **Instant Account-Free QR Verification:** Verifiers scan or look up certificate codes in $<10\text{ ms}$ with zero login barrier.
4. **Signature Differentiator — Dual-Vector Verification & Tamper Diagnostic:** In addition to QR lookup, verifiers can upload a PDF/SVG certificate to verify its bit-level SHA-256 hash against the server reference. If a participant edited their name using graphic editing tools while keeping the valid QR, the server instantly flags **"TAMPERED / FILE INTEGRITY MISMATCH"**.
5. **Gatekeeper Replay Telemetry:** Rapid consecutive scans of genuine credentials flag potential credential pass-backs at entry doors.

---

## 2. Quick Setup & Local Deployment Guide

### Prerequisites
- PHP 8.1 or higher (PDO and OpenSSL extensions enabled)
- MySQL 8.0+ or MariaDB 10.4+ (Default port: 3307 or 3306)

### One-Step Setup Command
From the project root (`certishield/`):

1. **Configure Environment:**
   Review `config/app.php` or create a `.env` file from `.env.example`. Default connects to MariaDB/MySQL on `127.0.0.1:3307` or `3306` with user `root` and empty password.

2. **Run Schema Migration & Synthetic Demo Seed:**
   ```bash
   php database/seed.php
   ```
   *This automatically sets up all required tables, foreign keys, and pre-seeds realistic synthetic records for the live demonstration.*

3. **Launch Local Development Server:**
   ```bash
   php -S localhost:8000 -t public
   ```
   *Open [http://localhost:8000](http://localhost:8000) in your browser.*

4. **Run the Automated Security & Quality Test Suite:**
   ```bash
   php tests/test_suite.php
   ```

---

## 3. Pre-Seeded Synthetic Accounts & Demo Credentials

| Role | Email Address | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Platform Administrator** | `admin@certishield.edu` | `Admin@CertiShield2026` | Approve/suspend organizers, platform audit logs |
| **Approved Organizer (ACM)** | `acm@studentchapter.edu` | `Organizer@ACM2026` | Manage events, issue certs, revoke certs |
| **Pending Organizer (Robotics)** | `robotics@campus.edu` | `Pending@Robot2026` | Awaiting admin vetting; issuance blocked |

---

## 4. Judges' Live Demonstration Walkthrough (3-Minute Tour)

Use the top persistent banner on every page or click the links below to test all five official evaluation scenarios:

### Scenario 1: Genuine Active Certificate
- **URL:** [http://localhost:8000/verify.php?id=GPH-26-8F29A](http://localhost:8000/verify.php?id=GPH-26-8F29A)
- **Result:** **GREEN BADGE — VERIFIED GENUINE**.
- **Evidence:** Shows participant name (`Aryan Sharma`), masked privacy preview (`A***n S****a`), event name (`GRAPHITE 26 National Hackathon`), vetted issuing body (`ACM Student Chapter`), and canonical SHA-256 metadata hash.
- **Action:** Click *"View Official Printable Certificate"* to inspect the rendered vector certificate with its embedded verification QR.

### Scenario 2: Revoked Credential
- **URL:** [http://localhost:8000/verify.php?id=GPH-26-REVOK](http://localhost:8000/verify.php?id=GPH-26-REVOK)
- **Result:** **RED BADGE — CERTIFICATE REVOKED**.
- **Evidence:** Clearly shows exact revocation timestamp and the organizer's reason: *"Disqualified for code plagiarism during evaluation."*

### Scenario 3: Expired Credential
- **URL:** [http://localhost:8000/verify.php?id=GPH-25-EXPIR](http://localhost:8000/verify.php?id=GPH-25-EXPIR)
- **Result:** **AMBER BADGE — CREDENTIAL EXPIRED**.
- **Evidence:** Shows that the credential expired on June 30, 2025.

### Scenario 4: Unknown / Forged Identifier
- **URL:** [http://localhost:8000/verify.php?id=GPH-26-FAKE99](http://localhost:8000/verify.php?id=GPH-26-FAKE99)
- **Result:** **NEUTRAL BADGE — CERTIFICATE NOT FOUND**.
- **Evidence:** Rejects lookup honestly without fabricating data.

### Scenario 5: File Tamper Diagnostic (Our Signature Differentiator)
- **URL:** [http://localhost:8000/verify.php?id=GPH-26-8F29A&demo_tamper=1](http://localhost:8000/verify.php?id=GPH-26-8F29A&demo_tamper=1)
- **Result:** **PINK/RED BADGE — TAMPERED / FILE INTEGRITY MISMATCH**.
- **Evidence:** Catches the altered document hash against the master server reference. Explains that the document content was modified after issuance.

### Scenario 6: IDOR & Security Isolation Check
- Log in as the administrator (`admin@certishield.edu`), inspect pending organizers, and approve or suspend organizations in real time.
- Attempting to access an event from another organizer returns an explicit **403 Access Denied** via server-side authorization check.

---

## 5. Security Architecture & Threat Defenses

| Threat Vector | Defense Mechanism | Verified in Test Suite |
| :--- | :--- | :---: |
| **SQL Injection** | Strict PDO prepared statements with parameter binding throughout. Zero raw SQL concatenation. | **PASS** |
| **Cross-Site Scripting (XSS)** | All dynamic outputs sanitized through `Utils::e()` (`htmlspecialchars` with `ENT_QUOTES \| ENT_SUBSTITUTE`). | **PASS** |
| **Cross-Site Request Forgery (CSRF)** | Synchronizer token pattern enforced on all state-changing POST requests (`Security::requireCsrf()`). | **PASS** |
| **Brute-Force & Credential Stuffing** | Automatic account locking after 5 failed login attempts with constant-time dummy verify. | **PASS** |
| **Insecure Direct Object Reference (IDOR)** | Server validates event ownership before issuance, certificate viewing, or revocation. | **PASS** |
| **Public Data Harvesting / Privacy Leakage** | Public verification displays masked recipient names and identifiers (`A***n S****a`). | **PASS** |
| **Replay & Credential Pass-Back** | Real-time audit logs track scan frequency; flags anomalies if scanned 4+ times within 10 minutes. | **PASS** |

---

## 6. Project Directory Map

```
certishield/
├── config/
│   └── app.php               # Database configuration, app secrets, and rate limit settings
├── database/
│   ├── schema.sql            # Clean, production-ready relational schema
│   └── seed.php              # Automated database reset and synthetic fixture generator
├── src/
│   ├── Auth.php              # Secure authentication, RBAC, session management & audit logging
│   ├── CertificateService.php# Event management, single & batch CSV issuance, revocation
│   ├── Database.php          # Resilient PDO wrapper supporting MySQL/MariaDB & SQLite
│   ├── PDFService.php        # Vector SVG certificate generator with official institutional seal
│   ├── QRCodeService.php     # Pure PHP self-contained SVG QR code generator (zero external dependencies)
│   ├── Security.php          # CSRF validation, session hardening, and rate limiting
│   ├── Utils.php             # UUID generation, canonical hashing, privacy masking
│   └── VerificationService.php # Multi-step verification pipeline & replay anomaly engine
├── public/
│   ├── index.php             # Landing page with interactive PS 13 benchmark test matrix
│   ├── verify.php            # Public, friction-free verification scanner & file tamper check
│   ├── api_verify.php        # JSON verification API endpoint for mobile/automated scanners
│   ├── login.php             # Organizer & administrator authentication portal
│   ├── register.php          # Organizer club registration workflow (pending admin vetting)
│   ├── logout.php            # Secure session invalidation
│   ├── dashboard.php         # Organizer event hub with live issuance statistics
│   ├── event.php             # Event-level single & bulk CSV certificate issuance and revocation
│   ├── certificate.php       # Printable certificate viewer & SVG export
│   ├── admin.php             # Campus administrator vetting console and platform audit logs
│   ├── header.php            # Navigation bar with judge quick-jump switcher
│   ├── footer.php            # Consistent responsive footer
│   └── assets/css/app.css    # Clean, modern, accessible design system
└── tests/
    └── test_suite.php        # 17 automated security, cryptography, and functional test cases
```
