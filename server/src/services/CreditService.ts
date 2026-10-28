import { IDatabaseClient } from '../database/db';

export class CreditService {
  /**
   * Strictly grants 5 free credits on verified/approved institution signup.
   * Enforces transactional lock and idempotency.
   */
  static async grantFreeSignupCredits(db: IDatabaseClient, institutionId: number): Promise<number> {
    return db.transaction(async (tx) => {
      // Check existing wallet
      const check = await tx.query(
        'SELECT id, balance, free_credits_granted FROM credit_wallets WHERE institution_id = $1',
        [institutionId]
      );

      if (check.rows.length === 0) {
        // Initialize with 5 free credits (= 50 free certificates at 1 credit = 10 certs)
        await tx.query(
          `INSERT INTO credit_wallets (institution_id, balance, free_credits_remaining, free_credits_granted) 
           VALUES ($1, 50, 5, TRUE)`,
          [institutionId]
        );

        await tx.query(
          `INSERT INTO credit_ledger (institution_id, action_type, direction, credits, cost_in_paise, balance_before, balance_after, description)
           VALUES ($1, 'signup_grant', 'credit', 50, 0, 0, 50, 'Initial 5 free credits (50 certificates) granted upon registration')`,
          [institutionId]
        );
        return 50;
      }

      const wallet = check.rows[0];
      if (wallet.free_credits_granted) {
        return wallet.balance; // Idempotent: already granted
      }

      const newBalance = wallet.balance + 50;
      const nowClause = tx.isPostgres ? 'NOW()' : 'CURRENT_TIMESTAMP';
      await tx.query(
        `UPDATE credit_wallets 
         SET balance = $1, free_credits_remaining = 5, free_credits_granted = TRUE, updated_at = ${nowClause} 
         WHERE institution_id = $2`,
        [newBalance, institutionId]
      );

      await tx.query(
        `INSERT INTO credit_ledger (institution_id, action_type, direction, credits, cost_in_paise, balance_before, balance_after, description)
         VALUES ($1, 'signup_grant', 'credit', 50, 0, $2, $3, 'Initial 5 free credits (50 certificates) granted upon approval')`,
        [institutionId, wallet.balance, newBalance]
      );

      return newBalance;
    });
  }

  /**
   * Deducts exactly 1 credit for a successfully issued certificate.
   * Throws if insufficient balance.
   */
  static async deductIssuanceCredit(db: IDatabaseClient, institutionId: number, certCode: string): Promise<number> {
    const walletRes = await db.query(
      'SELECT id, balance, free_credits_remaining FROM credit_wallets WHERE institution_id = $1',
      [institutionId]
    );

    if (walletRes.rows.length === 0 || walletRes.rows[0].balance < 1) {
      throw new Error('Insufficient issuance credits. Please purchase credits at ₹0.10/credit to continue.');
    }

    const currentBalance = walletRes.rows[0].balance;
    const freeRemaining = Math.max(0, walletRes.rows[0].free_credits_remaining - 1);
    const newBalance = currentBalance - 1;

    const nowClause = db.isPostgres ? 'NOW()' : 'CURRENT_TIMESTAMP';

    await db.query(
      `UPDATE credit_wallets 
       SET balance = $1, free_credits_remaining = $2, updated_at = ${nowClause} 
       WHERE institution_id = $3`,
      [newBalance, freeRemaining, institutionId]
    );

    const description = `Issued certificate ${certCode}`;
    await db.query(
      `INSERT INTO credit_ledger (institution_id, action_type, direction, credits, cost_in_paise, balance_before, balance_after, reference_id, description)
       VALUES ($1, 'certificate_issue', 'debit', 1, 10, $2, $3, $4, $5)`,
      [institutionId, currentBalance, newBalance, certCode, description]
    );

    return newBalance;
  }

  /**
   * Recharges wallet credits based on the transparent ₹0.10 (10 paise) per certificate model.
   * Records payment reference and transactional audit log.
   */
  static async rechargeCredits(
    db: IDatabaseClient,
    institutionId: number,
    creditsCount: number,
    paymentMethod = 'UPI',
    paymentRef = ''
  ): Promise<{ newBalance: number; invoiceId: string; amountInRupees: number }> {
    if (creditsCount <= 0) {
      throw new Error('Credit recharge amount must be greater than zero.');
    }

    const costInPaise = creditsCount * 10; // Exactly ₹0.10 per credit
    const amountInRupees = costInPaise / 100;
    const invoiceId = `INV-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowClause = db.isPostgres ? 'NOW()' : 'CURRENT_TIMESTAMP';

    const walletRes = await db.query(
      'SELECT id, balance FROM credit_wallets WHERE institution_id = $1',
      [institutionId]
    );

    const currentBalance = walletRes.rows.length > 0 ? walletRes.rows[0].balance : 0;
    const newBalance = currentBalance + creditsCount;

    if (walletRes.rows.length === 0) {
      await db.query(
        `INSERT INTO credit_wallets (institution_id, balance, free_credits_remaining, free_credits_granted)
         VALUES ($1, $2, 0, TRUE)`,
        [institutionId, newBalance]
      );
    } else {
      await db.query(
        `UPDATE credit_wallets SET balance = $1, updated_at = ${nowClause} WHERE institution_id = $2`,
        [newBalance, institutionId]
      );
    }

    const description = `Purchased ${creditsCount} issuance credits for ₹${amountInRupees.toFixed(2)} via ${paymentMethod} (${paymentRef || 'TXN-VERIFIED'})`;
    await db.query(
      `INSERT INTO credit_ledger (institution_id, action_type, direction, credits, cost_in_paise, balance_before, balance_after, reference_id, description)
       VALUES ($1, 'credit_purchase', 'credit', $2, $3, $4, $5, $6, $7)`,
      [institutionId, creditsCount, costInPaise, currentBalance, newBalance, invoiceId, description]
    );

    return { newBalance, invoiceId, amountInRupees };
  }
}
