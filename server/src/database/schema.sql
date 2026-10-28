-- ====================================================================
-- CertiShield PostgreSQL Database Schema
-- Problem Statement 13: Certificate Authenticity Verifier
-- Institution Trust Passport, Event Authorization, Transacted Credit Ledger
-- ====================================================================

-- 1. Institutions Table (Platform Admin & Vetted Institutions)
CREATE TABLE IF NOT EXISTS institutions (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    organization_name VARCHAR(200) NOT NULL,
    official_website VARCHAR(255) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    authorized_rep_name VARCHAR(150) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    phone VARCHAR(30) NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'institution', -- 'admin' or 'institution'
    status VARCHAR(20) NOT NULL DEFAULT 'pending',   -- 'pending', 'approved', 'rejected', 'suspended'
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verification_token VARCHAR(128) NULL,
    email_verification_expires TIMESTAMP WITH TIME ZONE NULL,
    review_notes TEXT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE NULL,
    reviewed_by INTEGER NULL,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_institutions_status ON institutions(status);
CREATE INDEX IF NOT EXISTS idx_institutions_domain ON institutions(domain);

-- 2. Credit Wallets Table (Integer paise precision & balance lock)
CREATE TABLE IF NOT EXISTS credit_wallets (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL UNIQUE REFERENCES institutions(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0, -- Credits available for certificate issuance (1 credit = 1 cert)
    free_credits_remaining INTEGER NOT NULL DEFAULT 5, -- Strictly 5 free credits on approved signup
    free_credits_granted BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Transacted Credit Ledger (Audit trail for grants, purchases, usage, refunds)
CREATE TABLE IF NOT EXISTS credit_ledger (
    id BIGSERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    action_type VARCHAR(30) NOT NULL, -- 'signup_grant', 'certificate_issue', 'purchase', 'adjustment'
    direction VARCHAR(10) NOT NULL,    -- 'credit' or 'debit'
    credits INTEGER NOT NULL,          -- Quantity of credits
    cost_in_paise INTEGER NOT NULL DEFAULT 0, -- Integer paise (₹1 = 100 paise)
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reference_id VARCHAR(100) NULL,    -- certificate_code or order_id
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_inst ON credit_ledger(institution_id);

-- 4. Events Table (Strict Event-Level Multi-Tenancy)
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(60) NOT NULL DEFAULT 'Hackathon',
    event_date DATE NOT NULL,
    venue VARCHAR(200) NOT NULL,
    description TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'completed', 'archived'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_inst ON events(institution_id);

-- 5. Certificates Table (Cryptographically hashed, unpredictable IDs)
CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    certificate_code VARCHAR(32) NOT NULL UNIQUE,     -- Human-readable e.g. GPH-26-8F29A
    uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(), -- High-entropy QR token
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    recipient_name VARCHAR(200) NOT NULL,
    recipient_email VARCHAR(254) NOT NULL,
    recipient_identifier VARCHAR(64) NULL,            -- Masked Roll / Reg No
    participation_role VARCHAR(100) NOT NULL DEFAULT 'Participant',
    issue_date DATE NOT NULL,
    expiry_date DATE NULL,
    canonical_hash CHAR(64) NOT NULL,                 -- SHA-256 of canonical fields
    file_hash CHAR(64) NULL,                          -- Bit-level artifact SHA-256
    status VARCHAR(20) NOT NULL DEFAULT 'active',     -- 'active', 'revoked'
    revocation_reason VARCHAR(255) NULL,
    revoked_at TIMESTAMP WITH TIME ZONE NULL,
    revoked_by INTEGER NULL REFERENCES institutions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cert_code ON certificates(certificate_code);
CREATE INDEX IF NOT EXISTS idx_cert_uuid ON certificates(uuid);
CREATE INDEX IF NOT EXISTS idx_cert_event ON certificates(event_id);

-- 6. Verification Audit & Replay Detector Logs
CREATE TABLE IF NOT EXISTS verification_logs (
    id BIGSERIAL PRIMARY KEY,
    certificate_id INTEGER NULL REFERENCES certificates(id) ON DELETE SET NULL,
    scanned_identifier VARCHAR(100) NOT NULL,
    verdict VARCHAR(30) NOT NULL, -- 'verified', 'revoked', 'expired', 'not_found', 'tampered', 'untrusted_issuer'
    ip_hash CHAR(64) NOT NULL,
    user_agent VARCHAR(255) NULL,
    scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vlogs_cert ON verification_logs(certificate_id, scanned_at);
CREATE INDEX IF NOT EXISTS idx_vlogs_ip ON verification_logs(ip_hash, scanned_at);

-- 7. Platform Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id INTEGER NULL REFERENCES institutions(id) ON DELETE SET NULL,
    action VARCHAR(60) NOT NULL,
    target_type VARCHAR(60) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NULL,
    details TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
