import { Router } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../database/db';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { CreditService } from '../services/CreditService';

const router = Router();

// Platform Admin: List all institution applications
router.get('/institutions', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const db = await getDatabase();
    const result = await db.query(
      `SELECT i.id, i.uuid, i.organization_name, i.official_website, i.domain, i.authorized_rep_name, 
              i.email, i.phone, i.status, i.email_verified, i.review_notes, i.reviewed_at, i.created_at,
              w.balance, w.free_credits_remaining
       FROM institutions i
       LEFT JOIN credit_wallets w ON i.id = w.institution_id
       WHERE i.role = 'institution'
       ORDER BY i.created_at DESC`
    );

    res.json({ institutions: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Platform Admin: Directly create/add an approved institution
router.post('/institutions', requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { organization_name, authorized_rep_name, email, phone, password } = req.body;
    if (!organization_name || !email) {
      return res.status(400).json({ error: 'Organization name and email are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailDomain = cleanEmail.split('@')[1] || 'campus.edu';
    const cleanWebsite = `https://${emailDomain}`;

    const db = await getDatabase();
    const existing = await db.query('SELECT id FROM institutions WHERE email = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'An institution with this email already exists.' });
    }

    const instPass = password && password.length >= 6 ? password : 'Password@2026';
    const hash = await bcrypt.hash(instPass, 10);
    const instUuid = randomUUID();

    await db.query(
      `INSERT INTO institutions 
       (uuid, organization_name, official_website, domain, authorized_rep_name, email, phone, password_hash, role, status, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'institution', 'approved', TRUE)`,
      [
        instUuid,
        organization_name.trim(),
        cleanWebsite,
        emailDomain,
        authorized_rep_name?.trim() || organization_name.trim(),
        cleanEmail,
        phone?.trim() || null,
        hash,
      ]
    );

    const instQuery = await db.query('SELECT * FROM institutions WHERE email = $1', [cleanEmail]);
    const inst = instQuery.rows[0];

    // Grant 5 free credits (50 certificates) immediately
    await CreditService.grantFreeSignupCredits(db, inst.id);

    res.status(201).json({
      success: true,
      message: `Institution '${organization_name}' created and approved with 5 free credits (50 certificates).`,
      institution: inst,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Platform Admin: Review & Approve / Suspend / Reject Institution
router.post('/institutions/:id/review', requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const instId = parseInt(req.params.id, 10);
    const { status, notes } = req.body;

    if (!['approved', 'rejected', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be approved, rejected, suspended, or pending.' });
    }

    const db = await getDatabase();
    const nowFunc = db.isPostgres ? 'NOW()' : 'CURRENT_TIMESTAMP';

    await db.query(
      `UPDATE institutions 
       SET status = $1, review_notes = $2, reviewed_at = ${nowFunc}, reviewed_by = $3, updated_at = ${nowFunc} 
       WHERE id = $4`,
      [status, notes?.trim() || null, req.user!.id, instId]
    );

    // If newly approved, ensure 5 free credits are granted
    if (status === 'approved') {
      await CreditService.grantFreeSignupCredits(db, instId);
    }

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, ip_address, details)
       VALUES ($1, 'admin_review_institution', 'institutions', $2, $3, $4)`,
      [req.user!.id, String(instId), req.ip || '127.0.0.1', `Status set to ${status}. Notes: ${notes || 'None'}`]
    );

    res.json({ message: `Institution status successfully updated to '${status}'.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Platform Admin: View platform audit log
router.get('/audit-logs', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const db = await getDatabase();
    const result = await db.query(
      `SELECT a.*, i.organization_name 
       FROM audit_logs a 
       LEFT JOIN institutions i ON a.actor_id = i.id 
       ORDER BY a.created_at DESC 
       LIMIT 50`
    );
    res.json({ logs: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
