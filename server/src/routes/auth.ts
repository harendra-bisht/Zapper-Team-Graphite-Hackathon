import { Router } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database/db';
import { normalizeDomain } from '../services/utils';
import { CreditService } from '../services/CreditService';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Institution Registration (Immediately creates, approves, and initializes 5 free credits)
router.post('/register', async (req, res) => {
  try {
    const { organization_name, official_website, authorized_rep_name, position, email, phone, password } = req.body;

    if (!organization_name || !organization_name.trim()) {
      return res.status(400).json({ error: 'Please enter your Organization / Club Name.' });
    }
    if (!authorized_rep_name || !authorized_rep_name.trim()) {
      return res.status(400).json({ error: 'Please enter the Lead Representative Name.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Please provide an Institutional Email address.' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Please provide a password.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email format (e.g. name@campus.edu).' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long for security.' });
    }

    const repWithPosition = position && position.trim() 
      ? `${authorized_rep_name.trim()} (${position.trim()})`
      : authorized_rep_name.trim();

    const emailDomain = cleanEmail.split('@')[1] || 'campus.edu';
    const cleanWebsite = (official_website && official_website.trim())
      ? (official_website.trim().startsWith('http') ? official_website.trim() : `https://${official_website.trim()}`)
      : `https://${emailDomain}`;
    const domain = normalizeDomain(cleanWebsite);

    const db = await getDatabase();
    const existing = await db.query('SELECT id FROM institutions WHERE email = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'An institution account with this email address already exists. Please sign in instead.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const instUuid = randomUUID();

    await db.query(
      `INSERT INTO institutions 
       (uuid, organization_name, official_website, domain, authorized_rep_name, email, phone, password_hash, role, status, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'institution', 'approved', TRUE)`,
      [
        instUuid,
        organization_name.trim(),
        cleanWebsite,
        domain,
        repWithPosition,
        cleanEmail,
        phone?.trim() || null,
        hash,
      ]
    );

    const instQuery = await db.query('SELECT * FROM institutions WHERE email = $1', [cleanEmail]);
    const institution = instQuery.rows[0];
    const institutionId = institution.id;

    // Immediately grant 5 free credits (50 certificates)
    await CreditService.grantFreeSignupCredits(db, institutionId);

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, ip_address, details)
       VALUES ($1, 'institution_registered', 'institutions', $2, $3, $4)`,
      [
        institutionId,
        String(institutionId),
        req.ip || '127.0.0.1',
        `Institution ${organization_name.trim()} successfully registered and approved.`,
      ]
    );

    // Generate JWT token so user is logged in right away
    const payload = {
      id: institution.id,
      uuid: institution.uuid,
      name: institution.authorized_rep_name,
      email: institution.email,
      role: institution.role,
      status: 'approved',
      organization_name: institution.organization_name,
      domain: domain,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '8h' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: 'Institution registered and approved successfully! 5 Free Credits (= 50 Certificates) granted.',
      token,
      user: payload,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Single-use Email Confirmation Endpoint
router.post('/confirm-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Verification token required' });

    const db = await getDatabase();
    const result = await db.query(
      `UPDATE institutions 
       SET email_verified = TRUE, email_verification_token = NULL 
       WHERE email_verification_token = $1 AND email_verified = FALSE
       RETURNING id, organization_name`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or already used verification token.' });
    }

    res.json({
      message: 'Institutional email successfully confirmed. Account remains in pending state until administrator review.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !email.trim()) return res.status(400).json({ error: 'Please enter your institutional email.' });
    if (!password) return res.status(400).json({ error: 'Please enter your password.' });

    const cleanEmail = email.trim().toLowerCase();
    const db = await getDatabase();
    const resUser = await db.query('SELECT * FROM institutions WHERE email = $1 LIMIT 1', [cleanEmail]);

    if (resUser.rows.length === 0) {
      return res.status(401).json({ error: 'No account found with this email. Please check your spelling or register a new institution.' });
    }

    const user = resUser.rows[0];

    // Check account lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(403).json({ error: 'Account temporarily locked due to failed attempts. Please try again in 15 minutes.' });
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const lockout = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await db.query(
        'UPDATE institutions SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
        [attempts, lockout, user.id]
      );
      return res.status(401).json({ error: 'Incorrect password. Please verify your credentials and try again.' });
    }

    // Reset failed attempts
    await db.query('UPDATE institutions SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1', [user.id]);

    const payload = {
      id: user.id,
      uuid: user.uuid,
      name: user.authorized_rep_name,
      email: user.email,
      role: user.role,
      status: user.status,
      organization_name: user.organization_name,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '8h' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 3600 * 1000,
    });

    res.json({ token, user: payload });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Current User Profile
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const db = await getDatabase();
    // Fresh query to get latest approval status & wallet
    const q = await db.query(
      `SELECT i.id, i.uuid, i.organization_name, i.official_website, i.authorized_rep_name, i.email, i.role, i.status, i.email_verified,
              w.balance, w.free_credits_remaining
       FROM institutions i
       LEFT JOIN credit_wallets w ON i.id = w.institution_id
       WHERE i.id = $1`,
      [req.user!.id]
    );

    if (q.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: q.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully.' });
});

export default router;
