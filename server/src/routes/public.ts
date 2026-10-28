import { Router } from 'express';
import QRCode from 'qrcode';
import { getDatabase } from '../database/db';
import { VerificationEngine } from '../services/VerificationEngine';
import { getLanIp, getPublicBaseUrl } from '../utils/lanIp';

const router = Router();

// Server LAN network info for mobile QR synchronization
router.get('/network-info', (req, res) => {
  const lanIp = getLanIp();
  const port = process.env.PORT || 5000;
  res.json({
    ip: lanIp,
    port: Number(port),
    base_url: getPublicBaseUrl(),
  });
});

// Server-side direct QR image generation (100% offline, standard 4-module quiet zone, phone camera ready)
router.get('/qr', async (req, res) => {
  try {
    const text = (req.query.text || req.query.url) as string;
    if (!text) {
      return res.status(400).json({ error: 'Text or url parameter required.' });
    }
    const qrBuffer = await QRCode.toBuffer(text, {
      width: 360,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(qrBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Public instant certificate verification endpoint (Zero login required)
router.get('/verify/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const candidateHash = typeof req.query.file_hash === 'string' ? req.query.file_hash : null;
    const db = await getDatabase();

    const verdict = await VerificationEngine.verify(
      db,
      identifier,
      candidateHash,
      req.ip || '127.0.0.1',
      req.headers['user-agent'] || 'Public Browser'
    );

    res.json({
      status: 'success',
      data: verdict,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dual-vector file hash upload verification
router.post('/verify-document', async (req, res) => {
  try {
    const { identifier, file_hash } = req.body;
    if (!identifier || !file_hash) {
      return res.status(400).json({ error: 'Certificate identifier and file SHA-256 hash required.' });
    }

    const db = await getDatabase();
    const verdict = await VerificationEngine.verify(
      db,
      identifier,
      file_hash,
      req.ip || '127.0.0.1',
      req.headers['user-agent'] || 'Document Verifier'
    );

    res.json({
      status: 'success',
      data: verdict,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Public Institution Trust Passport Profile
router.get('/passport/:domainOrId', async (req, res) => {
  try {
    const rawTarget = req.params.domainOrId.trim();
    const target = rawTarget.toLowerCase();
    const db = await getDatabase();

    const query = `
      SELECT 
        i.id, i.uuid, i.organization_name, i.official_website, i.domain, i.status, 
        i.authorized_rep_name, i.reviewed_at, i.created_at,
        COUNT(DISTINCT e.id) as public_events_count,
        COUNT(c.id) as total_certificates_issued
      FROM institutions i
      LEFT JOIN events e ON i.id = e.institution_id
      LEFT JOIN certificates c ON e.id = c.event_id AND c.status = 'active'
      WHERE CAST(i.id AS TEXT) = $1 OR LOWER(i.domain) = $2 OR i.uuid = $1 OR LOWER(i.organization_name) = $2
      GROUP BY i.id
      LIMIT 1
    `;

    const result = await db.query(query, [rawTarget, target]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Institutional Trust Passport not found for identifier: '${rawTarget}'.` });
    }

    const inst = result.rows[0];

    res.json({
      passport: {
        id: inst.id,
        uuid: inst.uuid,
        organization_name: inst.organization_name,
        authorized_rep_name: inst.authorized_rep_name,
        official_website: inst.official_website,
        domain: inst.domain,
        trust_status: inst.status,
        is_verified_issuer: inst.status === 'approved',
        vetted_at: inst.reviewed_at,
        member_since: inst.created_at,
        metrics: {
          authorized_events: parseInt(inst.public_events_count || '0', 10),
          active_credentials_issued: parseInt(inst.total_certificates_issued || '0', 10),
        },
        trust_statement:
          inst.status === 'approved'
            ? 'This institution has completed official administrative review and domain verification. Credentials issued by this entity are verifiable in the CertiShield Master Registry.'
            : 'This institution is not currently approved for trusted certificate issuance.',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Public Platform-Wide Overview & Metrics (Powers the Main Dashboard)
router.get('/platform-overview', async (req, res) => {
  try {
    const db = await getDatabase();
    
    // Stats
    const certStats = await db.query(`
      SELECT 
        COUNT(*) as total_certificates,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_certificates,
        SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) as revoked_certificates,
        SUM(CASE WHEN expiry_date IS NOT NULL AND expiry_date < date('now') THEN 1 ELSE 0 END) as expired_certificates
      FROM certificates
    `);
    
    const instStats = await db.query(`
      SELECT 
        COUNT(*) as total_institutions,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_institutions
      FROM institutions
    `);

    const scanStats = await db.query(`SELECT COUNT(*) as total_scans FROM verification_logs`);

    // Recent certificates
    const certsRes = await db.query(`
      SELECT 
        c.id, c.certificate_code, c.recipient_name, c.participation_role, c.issue_date, c.expiry_date, c.status, c.canonical_hash, c.template_id,
        e.title as event_title, e.category as event_category,
        i.organization_name as institution_name, i.status as institution_status
      FROM certificates c
      JOIN events e ON c.event_id = e.id
      JOIN institutions i ON c.institution_id = i.id
      ORDER BY c.id DESC
      LIMIT 15
    `);

    // Accredited institutions
    const institutionsRes = await db.query(`
      SELECT id, organization_name, official_website, domain, status, created_at
      FROM institutions
      ORDER BY status ASC, created_at DESC
    `);

    res.json({
      stats: {
        total_certificates: parseInt(certStats.rows[0]?.total_certificates || '0', 10),
        active_certificates: parseInt(certStats.rows[0]?.active_certificates || '0', 10),
        revoked_certificates: parseInt(certStats.rows[0]?.revoked_certificates || '0', 10),
        expired_certificates: parseInt(certStats.rows[0]?.expired_certificates || '0', 10),
        total_institutions: parseInt(instStats.rows[0]?.total_institutions || '0', 10),
        approved_institutions: parseInt(instStats.rows[0]?.approved_institutions || '0', 10),
        total_scans: parseInt(scanStats.rows[0]?.total_scans || '0', 10),
      },
      recent_certificates: certsRes.rows,
      institutions: institutionsRes.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
