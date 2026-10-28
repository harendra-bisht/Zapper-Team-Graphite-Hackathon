import bcrypt from 'bcryptjs';
import { getDatabase } from './db';
import { canonicalHash } from '../services/utils';

export async function seedDatabase() {
  console.log('--- Initializing CertiShield Database & Tables ---');
  const db = await getDatabase();

  // Create tables if not exist (Supports both Postgres and SQLite)
  const isPg = db.isPostgres;

  const idCol = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const bigIdCol = isPg ? 'BIGSERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const timeType = isPg ? 'TIMESTAMP WITH TIME ZONE' : 'DATETIME';
  const nowFunc = isPg ? 'NOW()' : 'CURRENT_TIMESTAMP';

  // 1. institutions
  await db.query(`
    CREATE TABLE IF NOT EXISTS institutions (
      id ${idCol},
      uuid TEXT NOT NULL UNIQUE,
      organization_name TEXT NOT NULL,
      official_website TEXT NOT NULL,
      domain TEXT NOT NULL,
      authorized_rep_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'institution',
      status TEXT NOT NULL DEFAULT 'pending',
      email_verified BOOLEAN NOT NULL DEFAULT 0,
      email_verification_token TEXT,
      email_verification_expires ${timeType},
      review_notes TEXT,
      reviewed_at ${timeType},
      reviewed_by INTEGER,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until ${timeType},
      created_at ${timeType} NOT NULL DEFAULT ${nowFunc},
      updated_at ${timeType} NOT NULL DEFAULT ${nowFunc}
    );
  `);

  // 2. credit_wallets
  await db.query(`
    CREATE TABLE IF NOT EXISTS credit_wallets (
      id ${idCol},
      institution_id INTEGER NOT NULL UNIQUE,
      balance INTEGER NOT NULL DEFAULT 0,
      free_credits_remaining INTEGER NOT NULL DEFAULT 5,
      free_credits_granted BOOLEAN NOT NULL DEFAULT 0,
      updated_at ${timeType} NOT NULL DEFAULT ${nowFunc}
    );
  `);

  // 3. credit_ledger
  await db.query(`
    CREATE TABLE IF NOT EXISTS credit_ledger (
      id ${bigIdCol},
      institution_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      direction TEXT NOT NULL,
      credits INTEGER NOT NULL,
      cost_in_paise INTEGER NOT NULL DEFAULT 0,
      balance_before INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      reference_id TEXT,
      description TEXT NOT NULL,
      created_at ${timeType} NOT NULL DEFAULT ${nowFunc}
    );
  `);

  // 4. events
  await db.query(`
    CREATE TABLE IF NOT EXISTS events (
      id ${idCol},
      uuid TEXT NOT NULL UNIQUE,
      institution_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Hackathon',
      event_date TEXT NOT NULL,
      venue TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at ${timeType} NOT NULL DEFAULT ${nowFunc},
      updated_at ${timeType} NOT NULL DEFAULT ${nowFunc}
    );
  `);

  // 5. certificates
  await db.query(`
    CREATE TABLE IF NOT EXISTS certificates (
      id ${idCol},
      certificate_code TEXT NOT NULL UNIQUE,
      uuid TEXT NOT NULL UNIQUE,
      event_id INTEGER NOT NULL,
      institution_id INTEGER NOT NULL,
      recipient_name TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      recipient_identifier TEXT,
      participation_role TEXT NOT NULL DEFAULT 'Participant',
      issue_date TEXT NOT NULL,
      expiry_date TEXT,
      canonical_hash TEXT NOT NULL,
      file_hash TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      template_id TEXT NOT NULL DEFAULT 'plain_professional',
      revocation_reason TEXT,
      revoked_at ${timeType},
      revoked_by INTEGER,
      created_at ${timeType} NOT NULL DEFAULT ${nowFunc},
      updated_at ${timeType} NOT NULL DEFAULT ${nowFunc}
    );
  `);

  // 6. verification_logs
  await db.query(`
    CREATE TABLE IF NOT EXISTS verification_logs (
      id ${bigIdCol},
      certificate_id INTEGER,
      scanned_identifier TEXT NOT NULL,
      verdict TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      user_agent TEXT,
      scanned_at ${timeType} NOT NULL DEFAULT ${nowFunc}
    );
  `);

  // 7. audit_logs
  await db.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id ${bigIdCol},
      actor_id INTEGER,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      ip_address TEXT,
      details TEXT,
      created_at ${timeType} NOT NULL DEFAULT ${nowFunc}
    );
  `);

  console.log('✓ All database tables verified.');

  // Clean all previous stored data so users can create everything live on the spot
  await db.query('DELETE FROM verification_logs');
  await db.query('DELETE FROM credit_ledger');
  await db.query('DELETE FROM certificates');
  await db.query('DELETE FROM events');
  await db.query('DELETE FROM credit_wallets');
  await db.query('DELETE FROM audit_logs');
  await db.query('DELETE FROM institutions');

  // Seed Sole Essential Platform Admin Account
  const adminPass = await bcrypt.hash('Admin@CertiShield2026', 10);
  await db.query(
    `INSERT INTO institutions 
     (id, uuid, organization_name, official_website, domain, authorized_rep_name, email, password_hash, role, status, email_verified)
     VALUES (1, '00000000-0000-0000-0000-000000000001', 'Graphite Academic Council', 'https://graphite.edu', 'graphite.edu', 'Campus Administrator', 'admin@certishield.edu', $1, 'admin', 'approved', TRUE)`,
    [adminPass]
  );
  console.log('✓ Database cleaned! Only Platform Admin seeded: admin@certishield.edu / Admin@CertiShield2026');
  console.log('--- Ready for Live On-The-Spot Demo ---');

  console.log('--- Database Seeding Complete ---');
}

if (require.main === module) {
  seedDatabase().then(() => process.exit(0)).catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}
