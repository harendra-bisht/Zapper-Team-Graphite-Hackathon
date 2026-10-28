-- ====================================================================
-- CertiShield Database Schema (MySQL 8.0+ / MariaDB 10.4+)
-- Problem Statement 13: Certificate Authenticity Verifier
-- Multi-Tenant Event Hub + Dual-Vector Tamper-Proof Cryptographic Verification
-- ====================================================================

CREATE DATABASE IF NOT EXISTS certishield
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE certishield;

-- 1. Users table (Platform Admins and Authorized Event Organizers)
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'organizer') NOT NULL DEFAULT 'organizer',
    status ENUM('pending', 'approved', 'suspended') NOT NULL DEFAULT 'pending',
    organization_name VARCHAR(191) NOT NULL,
    contact_phone VARCHAR(32) NULL,
    institution_website VARCHAR(255) NULL,
    failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0,
    locked_until DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_role_status (role, status),
    INDEX idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Events Hub table (Multi-tenancy: each event strictly belongs to an approved user)
CREATE TABLE IF NOT EXISTS events (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    user_id INT UNSIGNED NOT NULL,
    title VARCHAR(191) NOT NULL,
    category VARCHAR(64) NOT NULL DEFAULT 'Hackathon',
    event_date DATE NOT NULL,
    venue VARCHAR(191) NOT NULL,
    description TEXT NULL,
    status ENUM('active', 'completed', 'archived') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_events_user (user_id),
    INDEX idx_events_date (event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Certificates table (The core immutable ledger)
CREATE TABLE IF NOT EXISTS certificates (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    certificate_code VARCHAR(32) NOT NULL UNIQUE,      -- Human-readable e.g. GPH-26-8F29A
    uuid CHAR(36) NOT NULL UNIQUE,                      -- High-entropy opaque verification token
    event_id INT UNSIGNED NOT NULL,
    recipient_name VARCHAR(191) NOT NULL,
    recipient_email VARCHAR(191) NOT NULL,
    recipient_identifier VARCHAR(64) NULL,             -- Student Roll No or Team ID (Masked on public scan)
    participation_role VARCHAR(64) NOT NULL DEFAULT 'Participant',
    issue_date DATE NOT NULL,
    expiry_date DATE NULL,                             -- Supports credential expiry checks
    canonical_hash CHAR(64) NOT NULL,                  -- SHA-256 of canonical fields for metadata integrity
    file_hash CHAR(64) NULL,                           -- SHA-256 of rendered certificate document
    status ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
    revocation_reason VARCHAR(255) NULL,
    revoked_at DATETIME NULL,
    revoked_by INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT,
    FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_lookup_token (uuid),
    INDEX idx_cert_code (certificate_code),
    INDEX idx_event_certs (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Verification Audit Log & Anomaly/Replay Detector
CREATE TABLE IF NOT EXISTS verification_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    certificate_id INT UNSIGNED NULL,
    scanned_token VARCHAR(64) NOT NULL,
    verdict ENUM('verified', 'revoked', 'expired', 'not_found', 'tampered', 'untrusted_issuer') NOT NULL,
    ip_hash CHAR(64) NOT NULL,
    user_agent VARCHAR(255) NULL,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (certificate_id) REFERENCES certificates(id) ON DELETE SET NULL,
    INDEX idx_cert_scans (certificate_id, scanned_at),
    INDEX idx_ip_rate_limiting (ip_hash, scanned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Sensitive Operations Audit Trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45) NULL,
    details TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
