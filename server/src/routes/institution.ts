import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getDatabase } from '../database/db';
import { requireAuth, requireApprovedInstitution, AuthRequest } from '../middleware/auth';
import { generateCertCode, generateUniqueCertCode, canonicalHash } from '../services/utils';
import { CreditService } from '../services/CreditService';
import QRCode from 'qrcode';
import { getLanIp, getPublicBaseUrl } from '../utils/lanIp';

const router = Router();

// Helper to escape XML characters for SpreadsheetML Excel export
function escapeXml(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// 1. Create Event (Under Approved Institution)
router.post('/events', requireAuth, requireApprovedInstitution, async (req: AuthRequest, res) => {
  try {
    const { title, category, event_date, venue, description } = req.body;
    if (!title || !event_date || !venue) {
      return res.status(400).json({ error: 'Title, date, and venue are mandatory fields.' });
    }

    const db = await getDatabase();
    const eventUuid = randomUUID();

    const insertRes = await db.query(
      `INSERT INTO events (uuid, institution_id, title, category, event_date, venue, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [eventUuid, req.user!.id, title.trim(), category?.trim() || 'General', event_date, venue.trim(), description?.trim() || null]
    );

    res.status(201).json({
      event: insertRes.rows[0],
      message: 'Campus event created successfully.',
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 2. Fetch Events for Institution
router.get('/events', requireAuth, requireApprovedInstitution, async (req: AuthRequest, res) => {
  try {
    const db = await getDatabase();
    const eventsQuery = await db.query(
      `SELECT e.*, 
        COUNT(c.id) as total_certs,
        SUM(CASE WHEN c.status = 'active' THEN 1 ELSE 0 END) as active_certs
       FROM events e
       LEFT JOIN certificates c ON e.id = c.event_id
       WHERE e.institution_id = $1
       GROUP BY e.id
       ORDER BY e.created_at DESC`,
      [req.user!.id]
    );

    res.json({ events: eventsQuery.rows || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Issue Single Certificate (₹0.10 deduction / 1 credit unit)
router.post('/events/:eventId/certificates', requireAuth, requireApprovedInstitution, async (req: AuthRequest, res) => {
  try {
    const eventIdParam = req.params.eventId;
    const { 
      recipient_name, 
      father_name, 
      recipient_email, 
      recipient_identifier, 
      participation_role, 
      issue_date, 
      expiry_date,
      event_title // Allow creator to type any event title!
    } = req.body;

    if (!recipient_name || !recipient_name.trim()) {
      return res.status(400).json({ error: "Student's name is required." });
    }

    const db = await getDatabase();

    // Check or resolve event
    let event: any = null;
    let eventId: number;

    if (eventIdParam && eventIdParam !== 'custom' && !isNaN(parseInt(eventIdParam, 10))) {
      const parsedId = parseInt(eventIdParam, 10);
      const evCheck = await db.query('SELECT * FROM events WHERE id = $1 AND institution_id = $2', [parsedId, req.user!.id]);
      if (evCheck.rows.length > 0) {
        event = evCheck.rows[0];
        eventId = parsedId;
      }
    }

    // If event title was entered or custom event needed, find or create event automatically
    const targetTitle = (event_title && event_title.trim()) || (event && event.title) || 'Campus Event';
    if (!event) {
      // Find existing event with same title for this institution or create new one
      const existingEv = await db.query(
        'SELECT * FROM events WHERE institution_id = $1 AND LOWER(title) = LOWER($2) LIMIT 1',
        [req.user!.id, targetTitle]
      );
      if (existingEv.rows.length > 0) {
        event = existingEv.rows[0];
        eventId = event.id;
      } else {
        const evUuid = randomUUID();
        const evDate = issue_date || new Date().toISOString().split('T')[0];
        const newEvRes = await db.query(
          `INSERT INTO events (uuid, institution_id, title, category, event_date, venue, description)
           VALUES ($1, $2, $3, 'Institutional', $4, 'Campus', 'Event created during certificate issuance')
           RETURNING *`,
          [evUuid, req.user!.id, targetTitle, evDate]
        );
        event = newEvRes.rows[0];
        eventId = event.id;
      }
    } else if (event_title && event_title.trim() && event_title.trim() !== event.title) {
      // Custom typed event title specified by creator
      const evUuid = randomUUID();
      const evDate = issue_date || new Date().toISOString().split('T')[0];
      const newEvRes = await db.query(
        `INSERT INTO events (uuid, institution_id, title, category, event_date, venue, description)
         VALUES ($1, $2, $3, 'Institutional', $4, 'Campus', 'Event created during certificate issuance')
         RETURNING *`,
        [evUuid, req.user!.id, targetTitle, evDate]
      );
      event = newEvRes.rows[0];
      eventId = event.id;
    } else {
      eventId = event.id;
    }

    const certCode = await generateUniqueCertCode(db, 'CS-2026');
    const certUuid = randomUUID();
    const issueD = issue_date || new Date().toISOString().split('T')[0];
    const fatherN = father_name ? father_name.trim() : null;
    const cleanEmail = (recipient_email && recipient_email.trim()) 
      ? recipient_email.trim().toLowerCase() 
      : `${recipient_name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@student.certishield.internal`;

    // Compute canonical metadata hash (includes father_name in cryptographic seal)
    const canonicalPayload = {
      certificate_code: certCode,
      event_title: event.title,
      organization_name: req.user!.organization_name,
      recipient_name: recipient_name.trim(),
      father_name: fatherN,
      recipient_email: cleanEmail,
      recipient_identifier: recipient_identifier?.trim() || '',
      role: participation_role?.trim() || 'Participant',
      issue_date: issueD,
      uuid: certUuid,
    };
    const cHash = canonicalHash(canonicalPayload);
    // Bit-level artifact hash
    const fHash = canonicalHash({ ...canonicalPayload, signature_seal: 'CERTISHIELD_AUTHENTIC_2026' });

    // Deduct 1 credit transactionally
    await CreditService.deductIssuanceCredit(db, req.user!.id, certCode);

    await db.query(
      `INSERT INTO certificates 
       (certificate_code, uuid, event_id, institution_id, recipient_name, father_name, recipient_email, recipient_identifier, participation_role, issue_date, expiry_date, canonical_hash, file_hash, template_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'plain_professional', 'active')`,
      [
        certCode,
        certUuid,
        eventId,
        req.user!.id,
        recipient_name.trim(),
        fatherN,
        cleanEmail,
        recipient_identifier?.trim() || null,
        participation_role?.trim() || 'Participant',
        issueD,
        expiry_date || null,
        cHash,
        fHash,
      ]
    );

    // Query back full certificate row with event and issuing institution details
    const certRes = await db.query(
      `SELECT c.*, e.title as event_title, i.organization_name as institution_name, i.authorized_rep_name
       FROM certificates c
       JOIN events e ON c.event_id = e.id
       JOIN institutions i ON c.institution_id = i.id
       WHERE c.certificate_code = $1`,
      [certCode]
    );

    const cert = certRes.rows[0] || {
      certificate_code: certCode,
      uuid: certUuid,
      event_id: eventId,
      event_title: event.title,
      institution_id: req.user!.id,
      institution_name: req.user!.organization_name,
      authorized_rep_name: req.user!.authorized_rep_name || req.user!.name,
      recipient_name: recipient_name.trim(),
      father_name: fatherN,
      recipient_email: cleanEmail,
      recipient_identifier: recipient_identifier?.trim() || null,
      participation_role: participation_role?.trim() || 'Participant',
      issue_date: issueD,
      canonical_hash: cHash,
      file_hash: fHash,
      template_id: 'plain_professional',
      status: 'active',
    };

    // Generate Verification QR Code pointing to ?verify=CODE so it directly opens the certificate
    const verifyBase = getPublicBaseUrl();
    const verifyUrl = `${verifyBase}/?verify=${certCode}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 360,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    const fullCert = {
      ...cert,
      qr_code: qrDataUrl,
      verification_url: verifyUrl,
    };

    res.status(201).json({
      certificate: fullCert,
      qr_code: qrDataUrl,
      verification_url: verifyUrl,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Revoke Certificate (Immediate status update)
router.post('/certificates/:id/revoke', requireAuth, requireApprovedInstitution, async (req: AuthRequest, res) => {
  try {
    const certId = parseInt(req.params.id, 10);
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'A revocation reason is required.' });
    }

    const db = await getDatabase();

    // Enforce ownership: must belong to institution
    const certRes = await db.query(
      `SELECT c.*, e.title as event_title 
       FROM certificates c 
       JOIN events e ON c.event_id = e.id 
       WHERE c.id = $1 AND c.institution_id = $2`,
      [certId, req.user!.id]
    );

    if (certRes.rows.length === 0 && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Certificate not found or not owned by your institution.' });
    }

    await db.query(
      `UPDATE certificates 
       SET status = 'revoked', revocation_reason = $1, revoked_at = CURRENT_TIMESTAMP, revoked_by = $2 
       WHERE id = $3`,
      [reason.trim(), req.user!.id, certId]
    );

    res.json({ message: 'Certificate has been revoked permanently.', status: 'revoked' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Excel Export Endpoint for Authorized Staff Cross-Checking (Includes Father's Name)
router.get('/certificates/export-excel', requireAuth, requireApprovedInstitution, async (req: AuthRequest, res) => {
  try {
    const db = await getDatabase();
    const instId = req.user!.id;

    const certsQuery = await db.query(
      `SELECT 
        c.certificate_code,
        c.recipient_name,
        c.father_name,
        c.recipient_identifier,
        c.recipient_email,
        c.participation_role,
        e.title as event_title,
        i.organization_name as institution_name,
        c.issue_date,
        c.status,
        c.canonical_hash,
        c.created_at
       FROM certificates c
       JOIN events e ON c.event_id = e.id
       JOIN institutions i ON c.institution_id = i.id
       WHERE c.institution_id = $1
       ORDER BY c.id DESC`,
      [instId]
    );

    const rows = certsQuery.rows || [];
    const headers = [
      'Certificate ID',
      "Student's Name",
      "Father's Name (Private Staff Record)",
      'Student Roll/ID',
      'Contact Email',
      'Role / Achievement',
      'Event Title',
      'Issuing Institution',
      'Issue Date',
      'Status',
      'Cryptographic Hash (SHA-256)',
      'Created Timestamp'
    ];

    const dataRows = rows.map((c: any) => [
      c.certificate_code || '',
      c.recipient_name || '',
      c.father_name || 'N/A',
      c.recipient_identifier || 'N/A',
      c.recipient_email || '',
      c.participation_role || '',
      c.event_title || '',
      c.institution_name || '',
      c.issue_date || '',
      c.status || 'active',
      c.canonical_hash || '',
      c.created_at || ''
    ]);

    // Build Microsoft Excel XML Workbook (native .xls format recognized by Microsoft Excel / LibreOffice / Google Sheets)
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xml += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n';
    xml += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
    xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
    xml += ' <Styles>\n';
    xml += '  <Style ss:ID="Header">\n';
    xml += '   <Font ss:Bold="1" ss:Color="#FFFFFF" ss:FontName="Calibri" ss:Size="11"/>\n';
    xml += '   <Interior ss:Color="#1E3A8A" ss:Pattern="Solid"/>\n';
    xml += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>\n';
    xml += '   <Borders>\n';
    xml += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#000000"/>\n';
    xml += '   </Borders>\n';
    xml += '  </Style>\n';
    xml += '  <Style ss:ID="Data">\n';
    xml += '   <Font ss:FontName="Calibri" ss:Size="10"/>\n';
    xml += '   <Alignment ss:Vertical="Center"/>\n';
    xml += '  </Style>\n';
    xml += '  <Style ss:ID="StatusActive">\n';
    xml += '   <Font ss:Color="#065F46" ss:Bold="1" ss:FontName="Calibri" ss:Size="10"/>\n';
    xml += '   <Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/>\n';
    xml += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n';
    xml += '  </Style>\n';
    xml += ' </Styles>\n';
    xml += ' <Worksheet ss:Name="Certificates Registry">\n';
    xml += '  <Table>\n';
    xml += '   <Column ss:Width="130"/>\n';
    xml += '   <Column ss:Width="140"/>\n';
    xml += '   <Column ss:Width="160"/>\n';
    xml += '   <Column ss:Width="110"/>\n';
    xml += '   <Column ss:Width="160"/>\n';
    xml += '   <Column ss:Width="140"/>\n';
    xml += '   <Column ss:Width="160"/>\n';
    xml += '   <Column ss:Width="180"/>\n';
    xml += '   <Column ss:Width="90"/>\n';
    xml += '   <Column ss:Width="80"/>\n';
    xml += '   <Column ss:Width="200"/>\n';
    xml += '   <Column ss:Width="130"/>\n';

    // Header row
    xml += '   <Row ss:Height="26">\n';
    for (const h of headers) {
      xml += `    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>\n`;
    }
    xml += '   </Row>\n';

    // Data rows
    for (const r of dataRows) {
      xml += '   <Row ss:Height="20">\n';
      r.forEach((val: any, idx: number) => {
        const styleId = (idx === 9 && val === 'active') ? 'StatusActive' : 'Data';
        xml += `    <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(val)}</Data></Cell>\n`;
      });
      xml += '   </Row>\n';
    }

    xml += '  </Table>\n';
    xml += ' </Worksheet>\n';
    xml += '</Workbook>';

    const filename = `CertiShield_Staff_Registry_${Date.now()}.xls`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(xml);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Wallet Recharge Endpoint (₹0.10 per certificate / ₹1 per 10 credits)
router.post('/wallet/recharge', requireAuth, requireApprovedInstitution, async (req: AuthRequest, res) => {
  try {
    const { certificates_count, payment_method } = req.body;
    const certsCount = parseInt(certificates_count, 10);

    if (isNaN(certsCount) || certsCount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid positive number of certificates to purchase.' });
    }

    const db = await getDatabase();
    const instId = req.user!.id;
    const method = (payment_method || 'UPI').toUpperCase();
    const paymentRef = `TXN-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await CreditService.rechargeCredits(
      db,
      instId,
      certsCount,
      method,
      paymentRef
    );

    res.json({
      status: 'success',
      message: `Successfully added ${certsCount} certificates to your wallet.`,
      certificates_added: certsCount,
      new_balance: result.newBalance,
      invoice_id: result.invoiceId,
      amount_in_rupees: result.amountInRupees,
      payment_method: method,
      payment_ref: paymentRef,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 7. Complete Dashboard Overview for Institution
router.get('/dashboard', requireAuth, requireApprovedInstitution, async (req: AuthRequest, res) => {
  try {
    const db = await getDatabase();
    const instId = req.user!.id;

    // Aggregates
    const statsQuery = await db.query(
      `SELECT 
        COUNT(DISTINCT e.id) as total_events,
        COUNT(c.id) as total_certificates,
        SUM(CASE WHEN c.status = 'active' THEN 1 ELSE 0 END) as active_certificates,
        SUM(CASE WHEN c.status = 'revoked' THEN 1 ELSE 0 END) as revoked_certificates,
        SUM(CASE WHEN c.expiry_date IS NOT NULL AND c.expiry_date < CURRENT_DATE THEN 1 ELSE 0 END) as expired_certificates
      FROM events e
      LEFT JOIN certificates c ON e.id = c.event_id
      WHERE e.institution_id = $1`,
      [instId]
    );

    // Wallet query
    const walletQuery = await db.query(
      `SELECT balance, free_credits_remaining, free_credits_granted FROM credit_wallets WHERE institution_id = $1`,
      [instId]
    );

    // Recent credit ledger
    const ledgerQuery = await db.query(
      `SELECT * FROM credit_ledger WHERE institution_id = $1 ORDER BY created_at DESC LIMIT 15`,
      [instId]
    );

    // Recent certificates with event, father's name, and institution data
    const certsQuery = await db.query(
      `SELECT c.*, e.title as event_title, i.organization_name as institution_name, i.authorized_rep_name 
       FROM certificates c 
       JOIN events e ON c.event_id = e.id 
       JOIN institutions i ON c.institution_id = i.id 
       WHERE c.institution_id = $1 
       ORDER BY c.id DESC LIMIT 25`,
      [instId]
    );

    const wallet = walletQuery.rows[0] || { balance: 0, free_credits_remaining: 0 };
    const certsAvailable = wallet.balance;
    const credits = (certsAvailable / 10).toFixed(1);
    const balanceInRupees = (certsAvailable * 0.10).toFixed(2);

    res.json({
      stats: statsQuery.rows[0] || {},
      wallet: {
        ...wallet,
        certificates_available: certsAvailable,
        credits: credits,
        balance_in_rupees: balanceInRupees,
        rate_info: '1 Credit = ₹1.00 = 10 Certificates (₹0.10 per certificate)',
      },
      ledger: ledgerQuery.rows || [],
      recent_certificates: certsQuery.rows || [],
      business_model: {
        free_grant: '5 free credits (50 free certificates) upon approved registration',
        rate_rule: '1 credit = ₹1.00 = 10 certificates',
        cost_per_certificate: '₹0.10',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
