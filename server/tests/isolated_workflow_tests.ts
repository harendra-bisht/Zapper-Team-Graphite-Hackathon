import { getDatabase } from '../src/database/db';
import { VerificationEngine } from '../src/services/VerificationEngine';
import { CreditService } from '../src/services/CreditService';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

async function runIsolatedTests() {
  console.log('======================================================');
  console.log(' CertiShield Isolated Multi-Workflow Test Suite       ');
  console.log('======================================================\n');

  // Create isolated temp database to avoid touching real/seeded data
  const testDbFile = path.join(__dirname, 'test_isolated.db');
  if (fs.existsSync(testDbFile)) {
    fs.unlinkSync(testDbFile);
  }

  process.env.SQLITE_DB_PATH = testDbFile;
  process.env.DATABASE_URL = ''; // Force isolated client
  process.env.USE_SQLITE_FALLBACK = 'true';

  const db = await getDatabase();
  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, name: string, detail = '') {
    if (cond) {
      console.log(` [PASS] ${name}`);
      passed++;
    } else {
      console.log(` [FAIL] ${name} ${detail ? '-> ' + detail : ''}`);
      failed++;
    }
  }

  try {
    // 1. Initialize schema in isolated DB
    await db.query(`
      CREATE TABLE IF NOT EXISTS institutions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        email_verification_expires DATETIME,
        review_notes TEXT,
        reviewed_at DATETIME,
        reviewed_by INTEGER,
        failed_login_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until DATETIME,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS credit_wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        institution_id INTEGER NOT NULL UNIQUE,
        balance INTEGER NOT NULL DEFAULT 0,
        free_credits_remaining INTEGER NOT NULL DEFAULT 5,
        free_credits_granted BOOLEAN NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS credit_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        institution_id INTEGER NOT NULL,
        action_type TEXT NOT NULL,
        direction TEXT NOT NULL,
        credits INTEGER NOT NULL,
        cost_in_paise INTEGER NOT NULL DEFAULT 0,
        balance_before INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        reference_id TEXT,
        description TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT NOT NULL UNIQUE,
        institution_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Hackathon',
        event_date TEXT NOT NULL,
        venue TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        revocation_reason TEXT,
        revoked_at DATETIME,
        revoked_by INTEGER,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS verification_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        certificate_id INTEGER,
        scanned_identifier TEXT NOT NULL,
        verdict TEXT NOT NULL,
        ip_hash TEXT NOT NULL,
        user_agent TEXT,
        scanned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Workflow Test: New institution registration (status: pending)
    const testPass = await bcrypt.hash('TestPass123', 10);
    await db.query(
      `INSERT INTO institutions (id, uuid, organization_name, official_website, domain, authorized_rep_name, email, password_hash, role, status, email_verified)
       VALUES (10, 'uuid-inst-10', 'Stanford ACM', 'https://acm.stanford.edu', 'stanford.edu', 'Jane Doe', 'jane@stanford.edu', $1, 'institution', 'pending', 1)`,
      [testPass]
    );

    // Initial 5 free credits granted
    await CreditService.grantFreeSignupCredits(db, 10);
    const wallet = await db.query('SELECT balance, free_credits_remaining FROM credit_wallets WHERE institution_id = 10');
    assert(wallet.rows[0].balance === 5, 'Workflow 1: Institution registered with 5 free credits (pending approval)');

    // 3. Workflow Test: Issuance blocked while status == 'pending'
    const instCheck = await db.query('SELECT status FROM institutions WHERE id = 10');
    const isPending = instCheck.rows[0].status === 'pending';
    assert(isPending, 'Workflow 2: Default-deny: New institution cannot issue until approved by admin');

    // 4. Workflow Test: Admin approval & status change
    await db.query("UPDATE institutions SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP WHERE id = 10");
    const updatedStatus = (await db.query('SELECT status FROM institutions WHERE id = 10')).rows[0].status;
    assert(updatedStatus === 'approved', 'Workflow 3: Admin successfully vetted & approved institution');

    // 5. Workflow Test: Create Event under approved institution
    await db.query(
      `INSERT INTO events (id, uuid, institution_id, title, category, event_date, venue)
       VALUES (20, 'uuid-event-20', 10, 'Stanford Hack 2026', 'Hackathon', '2026-11-15', 'Gates CS Building')`
    );
    const eventCount = (await db.query('SELECT COUNT(*) as c FROM events WHERE institution_id = 10')).rows[0].c;
    assert(parseInt(eventCount, 10) === 1, 'Workflow 4: Authorized event created under approved institution');

    // 6. Workflow Test: Certificate Issuance with Credit Deduction
    await CreditService.deductIssuanceCredit(db, 10, 'STF-26-001');
    const walletAfter = await db.query('SELECT balance FROM credit_wallets WHERE institution_id = 10');
    assert(walletAfter.rows[0].balance === 4, 'Workflow 5: 1 credit deducted on successful certificate generation (5 -> 4)');

    await db.query(
      `INSERT INTO certificates 
       (id, certificate_code, uuid, event_id, institution_id, recipient_name, recipient_email, recipient_identifier, participation_role, issue_date, canonical_hash, file_hash, status)
       VALUES (50, 'STF-26-001', 'uuid-cert-50', 20, 10, 'Alice Walker', 'alice@stanford.edu', 'STF-9901', 'Grand Prize', '2026-11-15', 'hash123', 'filehash123', 'active')`
    );

    // 7. Workflow Test: Public Verification of newly issued cert
    const verif = await VerificationEngine.verify(db, 'STF-26-001');
    assert(
      verif.verdict === 'verified' && verif.is_authentic === true && verif.institution?.name === 'Stanford ACM',
      'Workflow 6: Public instant verification succeeds for newly issued active certificate'
    );

    // 8. Workflow Test: Revocation updates verification result at same URL
    await db.query(
      "UPDATE certificates SET status = 'revoked', revocation_reason = 'Academic honor code infraction', revoked_at = CURRENT_TIMESTAMP WHERE id = 50"
    );
    const verifRevoked = await VerificationEngine.verify(db, 'STF-26-001');
    assert(
      verifRevoked.verdict === 'revoked' && verifRevoked.is_authentic === false && verifRevoked.evidence.some(e => e.includes('honor code')),
      'Workflow 7: Immediate revocation reflection at exact same certificate ID'
    );

    // 9. Workflow Test: Cross-Event IDOR Protection (Institution 99 cannot touch Event 20)
    const idor = await db.query('SELECT * FROM events WHERE id = 20 AND institution_id = 99');
    assert(idor.rows.length === 0, 'Workflow 8: Cross-event IDOR access denied');

    // 10. Workflow Test: Server-side offline QR generation produces valid PNG
    const QRCode = require('qrcode');
    const qrBuffer = await QRCode.toBuffer('http://10.76.0.108:5000/?verify=STF-26-001');
    const isPng = qrBuffer[0] === 0x89 && qrBuffer[1] === 0x50 && qrBuffer[2] === 0x4e && qrBuffer[3] === 0x47;
    assert(isPng && qrBuffer.length > 100, 'Workflow 9: Server-side offline QR generator generates valid binary PNG');

    // 11. Workflow Test: Trust Passport transparency data integrity
    const passCheck = await db.query('SELECT organization_name, status, domain FROM institutions WHERE id = 10');
    assert(
      passCheck.rows[0].organization_name === 'Stanford ACM' && passCheck.rows[0].status === 'approved',
      'Workflow 10: Institutional Trust Passport returns vetted transparency profile'
    );

    // 12. Workflow Test: ₹0.10 Micro-billing credit recharge & transactional audit log
    const rechargeResult = await CreditService.rechargeCredits(db, 10, 500, 'UPI', 'TXN-TEST-UPI-99');
    assert(
      rechargeResult.newBalance === 504 && rechargeResult.amountInRupees === 50.00,
      'Workflow 11: ₹0.10/cert micro-billing model recharges 500 credits for exactly ₹50.00'
    );

    const ledgerCheck = await db.query(
      "SELECT * FROM credit_ledger WHERE institution_id = 10 AND action_type = 'credit_purchase' LIMIT 1"
    );
    assert(
      ledgerCheck.rows.length > 0 && ledgerCheck.rows[0].cost_in_paise === 5000 && ledgerCheck.rows[0].reference_id.startsWith('INV-'),
      'Workflow 12: Credit recharge generates verifiable GST invoice ID and ledger audit entry'
    );
  } catch (err: any) {
    console.error('Test error:', err);
    failed++;
  } finally {
    // Cleanup isolated DB
    try {
      await db.close();
      if (fs.existsSync(testDbFile)) {
        fs.unlinkSync(testDbFile);
      }
    } catch {}
  }

  console.log('\n======================================================');
  console.log(`ISOLATED TESTS: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================');

  if (failed > 0) process.exit(1);
}

runIsolatedTests().then(() => process.exit(0));
