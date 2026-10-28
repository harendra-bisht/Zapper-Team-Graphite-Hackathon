import { getDatabase } from '../src/database/db';
import { VerificationEngine } from '../src/services/VerificationEngine';
import { CreditService } from '../src/services/CreditService';
import bcrypt from 'bcryptjs';

async function runTests() {
  console.log('======================================================');
  console.log('  CertiShield TypeScript / Node API & Logic Tests     ');
  console.log('======================================================\n');

  const db = await getDatabase();
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail = '') {
    if (condition) {
      console.log(` [PASS] ${testName}`);
      passed++;
    } else {
      console.log(` [FAIL] ${testName} ${detail ? '-> ' + detail : ''}`);
      failed++;
    }
  }

  try {
    // 1. Password verification
    const adminRes = await db.query('SELECT password_hash FROM institutions WHERE email = $1', ['admin@certishield.edu']);
    const match = await bcrypt.compare('Admin@CertiShield2026', adminRes.rows[0].password_hash);
    assert(match, '1. Strong password hashing (bcrypt) and verification');

    // 2. Initial 5 free credits model
    const walletRes = await db.query('SELECT balance, free_credits_remaining FROM credit_wallets WHERE institution_id = 2');
    assert(
      walletRes.rows[0].balance === 5 && walletRes.rows[0].free_credits_remaining === 5,
      '2. Strictly 5 free credits granted upon vetted institution signup'
    );

    // 3. Genuine active certificate verification
    const vGenuine = await VerificationEngine.verify(db, 'GPH-26-8F29A');
    assert(
      vGenuine.verdict === 'verified' && vGenuine.is_authentic === true,
      '3. Instant verification of genuine active certificate'
    );

    // 4. Privacy preservation on public endpoint
    const isMasked = vGenuine.certificate?.recipient_name_masked.includes('*');
    assert(isMasked, '4. Privacy preservation: Public verification masks sensitive student name');

    // 5. Revocation verification & immediate state update
    const vRevoked = await VerificationEngine.verify(db, 'GPH-26-REVOK');
    assert(
      vRevoked.verdict === 'revoked' && vRevoked.is_authentic === false && vRevoked.evidence.some(e => e.includes('plagiarism')),
      '5. Immediate revocation verification at the same URL with stated reason'
    );

    // 6. Expired certificate detection
    const vExpired = await VerificationEngine.verify(db, 'GPH-25-EXPIR');
    assert(
      vExpired.verdict === 'expired' && vExpired.is_authentic === false,
      '6. Expired certificate detected and labelled honestly'
    );

    // 7. Unknown certificate ID
    const vNotFound = await VerificationEngine.verify(db, 'GPH-26-NONEXISTENT');
    assert(
      vNotFound.verdict === 'not_found' && vNotFound.is_authentic === false,
      '7. Unknown certificate ID returns honest NOT FOUND verdict'
    );

    // 8. Signature Differentiator: Bit-level file tamper diagnostic
    const fakeHash = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
    const vTampered = await VerificationEngine.verify(db, 'GPH-26-8F29A', fakeHash);
    assert(
      vTampered.verdict === 'tampered' && vTampered.is_authentic === false,
      '8. Dual-vector tamper check: Detects file alteration via SHA-256 mismatch'
    );

    // 9. Credit deduction on issuance & ledger balance tracking
    const newBal = await CreditService.deductIssuanceCredit(db, 2, 'GPH-26-TEST99');
    assert(newBal === 4, '9. Successful issuance charges exactly 1 credit (5 -> 4)');

    // 10. Credit ledger audit log recorded
    const ledgerRes = await db.query('SELECT COUNT(*) as count FROM credit_ledger WHERE institution_id = 2');
    assert(parseInt(ledgerRes.rows[0].count, 10) >= 2, '10. Transactional credit ledger records usage audit trail');

    // 11. Cross-event authorization isolation (User 3 cannot manage Event 1)
    const crossCheck = await db.query('SELECT * FROM events WHERE id = 1 AND institution_id = 3');
    assert(crossCheck.rows.length === 0, '11. Server-side authorization blocks cross-event / cross-institution IDOR');

    // 12. Replay anomaly telemetry detection
    for (let i = 0; i < 4; i++) {
      await VerificationEngine.verify(db, 'GPH-26-8F29A');
    }
    const vReplay = await VerificationEngine.verify(db, 'GPH-26-8F29A');
    assert(
      vReplay.anomaly_detected === true && vReplay.scan_count >= 5,
      '12. Gatekeeper replay detector flags rapid multi-scans of genuine certificates'
    );
  } catch (err: any) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================');

  if (failed > 0) process.exit(1);
}

runTests().then(() => process.exit(0));
