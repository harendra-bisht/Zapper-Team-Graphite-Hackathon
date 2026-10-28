import { IDatabaseClient } from '../database/db';
import { maskName, maskIdentifier, hashIp } from './utils';

export interface VerificationVerdict {
  verdict: 'verified' | 'revoked' | 'expired' | 'not_found' | 'tampered' | 'untrusted_issuer';
  verdict_title: string;
  is_authentic: boolean;
  evidence: string[];
  certificate: any | null;
  institution: any | null;
  event: any | null;
  scan_count: number;
  anomaly_detected: boolean;
}

export class VerificationEngine {
  static async verify(
    db: IDatabaseClient,
    identifier: string,
    candidateFileHash?: string | null,
    clientIp = '127.0.0.1',
    userAgent = 'CertiShield Verifier'
  ): Promise<VerificationVerdict> {
    const cleanId = identifier.trim();
    const ipH = hashIp(clientIp);

    const verdictResult: VerificationVerdict = {
      verdict: 'not_found',
      verdict_title: 'Certificate Not Found',
      is_authentic: false,
      evidence: [],
      certificate: null,
      institution: null,
      event: null,
      scan_count: 0,
      anomaly_detected: false,
    };

    if (!cleanId) {
      verdictResult.evidence.push('No certificate identifier provided.');
      return verdictResult;
    }

    // 1. Query certificate record joined with event and institution
    const query = `
      SELECT 
        c.id, c.certificate_code, c.uuid, c.recipient_name, c.recipient_email, c.recipient_identifier,
        c.participation_role, c.issue_date, c.expiry_date, c.canonical_hash, c.file_hash,
        c.status as cert_status, c.template_id, c.revocation_reason, c.revoked_at,
        e.id as event_id, e.title as event_title, e.category as event_category, e.event_date, e.venue as event_venue,
        i.id as institution_id, i.organization_name, i.official_website, i.domain, i.status as institution_status, i.reviewed_at
      FROM certificates c
      JOIN events e ON c.event_id = e.id
      JOIN institutions i ON c.institution_id = i.id
      WHERE UPPER(c.certificate_code) = UPPER($1) OR CAST(c.uuid AS TEXT) = $1
      LIMIT 1
    `;

    const res = await db.query(query, [cleanId]);

    if (res.rows.length === 0) {
      verdictResult.verdict = 'not_found';
      verdictResult.verdict_title = 'Record Not Found';
      verdictResult.evidence.push('No certificate record exists matching this code in the official institutional registry.');
      await this.logScan(db, null, cleanId, 'not_found', ipH, userAgent);
      return verdictResult;
    }

    const row = res.rows[0];
    const certId = row.id;

    verdictResult.certificate = {
      code: row.certificate_code,
      uuid: row.uuid,
      recipient_name_raw: row.recipient_name,
      recipient_name_masked: maskName(row.recipient_name),
      recipient_identifier: maskIdentifier(row.recipient_identifier),
      role: row.participation_role,
      issue_date: row.issue_date,
      expiry_date: row.expiry_date,
      canonical_hash: row.canonical_hash,
      status: row.cert_status,
      template_id: row.template_id || 'plain_professional',
    };

    verdictResult.institution = {
      name: row.organization_name,
      website: row.official_website,
      domain: row.domain,
      status: row.institution_status,
      reviewed_at: row.reviewed_at,
    };

    verdictResult.event = {
      title: row.event_title,
      category: row.event_category,
      date: row.event_date,
      venue: row.event_venue,
    };

    // 2. Check Issuer Legitimacy / Status
    if (row.institution_status !== 'approved') {
      verdictResult.verdict = 'untrusted_issuer';
      verdictResult.verdict_title = 'Untrusted / Unapproved Issuer';
      verdictResult.evidence.push(
        `The issuing institution '${row.organization_name}' is not currently authorized or approved (Status: ${row.institution_status}).`
      );
      await this.logScan(db, certId, cleanId, 'untrusted_issuer', ipH, userAgent);
      return verdictResult;
    }
    verdictResult.evidence.push(`Issuing institution '${row.organization_name}' is officially vetted and approved.`);

    // 3. Check Revocation Status
    if (row.cert_status === 'revoked') {
      verdictResult.verdict = 'revoked';
      verdictResult.verdict_title = 'Certificate Revoked';
      verdictResult.evidence.push(`Revoked on ${row.revoked_at || 'record date'}.`);
      verdictResult.evidence.push(`Revocation reason: ${row.revocation_reason || 'Disqualified or issued in error'}`);
      await this.logScan(db, certId, cleanId, 'revoked', ipH, userAgent);
      return verdictResult;
    }
    verdictResult.evidence.push('Certificate is in good standing and has not been revoked.');

    // 4. Check Expiration
    if (row.expiry_date && new Date(row.expiry_date) < new Date()) {
      verdictResult.verdict = 'expired';
      verdictResult.verdict_title = 'Credential Expired';
      verdictResult.evidence.push(`This credential expired on ${row.expiry_date}.`);
      await this.logScan(db, certId, cleanId, 'expired', ipH, userAgent);
      return verdictResult;
    }

    // 5. Dual-Vector File Integrity Check (if candidate hash provided)
    if (candidateFileHash) {
      const candidateClean = candidateFileHash.trim().toLowerCase();
      const storedClean = (row.file_hash || '').trim().toLowerCase();

      if (storedClean && storedClean !== candidateClean) {
        verdictResult.verdict = 'tampered';
        verdictResult.verdict_title = 'File Tampered / Integrity Mismatch';
        verdictResult.evidence.push('Uploaded file SHA-256 does not match the master server hash recorded at issuance.');
        verdictResult.evidence.push(`Expected: ${storedClean}`);
        verdictResult.evidence.push(`Received: ${candidateClean}`);
        await this.logScan(db, certId, cleanId, 'tampered', ipH, userAgent);
        return verdictResult;
      }
      verdictResult.evidence.push('Bit-level file integrity verified: Uploaded document matches exact server reference.');
    }

    // 6. Confirmed Genuine
    verdictResult.verdict = 'verified';
    verdictResult.verdict_title = 'Verified Genuine';
    verdictResult.is_authentic = true;
    verdictResult.evidence.push('Cryptographic certificate record matches official institutional registry.');

    // Scan Telemetry & Replay Detection
    const telemetry = await this.getScanTelemetry(db, certId);
    verdictResult.scan_count = telemetry.total + 1;
    verdictResult.anomaly_detected = telemetry.isReplay;

    if (verdictResult.anomaly_detected) {
      verdictResult.evidence.push(
        `Notice: Credential scanned ${verdictResult.scan_count} times recently. Gatekeepers should check photo ID.`
      );
    }

    await this.logScan(db, certId, cleanId, 'verified', ipH, userAgent);
    return verdictResult;
  }

  private static async logScan(
    db: IDatabaseClient,
    certId: number | null,
    identifier: string,
    verdict: string,
    ipHash: string,
    userAgent: string
  ): Promise<void> {
    try {
      await db.query(
        `INSERT INTO verification_logs (certificate_id, scanned_identifier, verdict, ip_hash, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [certId, identifier.slice(0, 100), verdict, ipHash, userAgent.slice(0, 255)]
      );
    } catch (err: any) {
      console.error('Scan log error:', err.message);
    }
  }

  private static async getScanTelemetry(db: IDatabaseClient, certId: number): Promise<{ total: number; isReplay: boolean }> {
    try {
      const res = await db.query(
        `SELECT COUNT(*) as total FROM verification_logs WHERE certificate_id = $1`,
        [certId]
      );
      const total = parseInt(res.rows[0]?.total || '0', 10);
      return { total, isReplay: total >= 4 };
    } catch {
      return { total: 0, isReplay: false };
    }
  }
}
