<?php
declare(strict_types=1);

namespace CertiShield;

use PDO;

class VerificationService
{
    /**
     * Complete multi-step verification pipeline according to Phase 4 rules.
     * Evaluates issuer trust, event binding, active/revoked/expired status, and optional file hash integrity.
     */
    public static function verify(
        PDO $pdo,
        string $identifier,
        ?string $candidateFileHash = null,
        ?string $clientIp = null,
        ?string $userAgent = null
    ): array {
        $identifier = trim($identifier);
        $salt = 'certishield_ip_salt_2026';
        $ipHash = Utils::hashIp($clientIp ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1', $salt);

        // Precedence & State defaults
        $result = [
            'verdict' => 'not_found',
            'verdict_title' => 'Not Found',
            'status_class' => 'status-not-found',
            'is_authentic' => false,
            'evidence' => [],
            'certificate' => null,
            'issuer' => null,
            'event' => null,
            'scan_count' => 0,
            'anomaly_detected' => false,
        ];

        if ($identifier === '') {
            $result['evidence'][] = 'Empty identifier provided.';
            self::logVerification($pdo, null, $identifier, 'not_found', $ipHash, $userAgent);
            return $result;
        }

        // Query certificate joined with event and issuer
        // Accepts either human-readable code (GPH-26-XXXX) or high-entropy UUID token
        $stmt = $pdo->prepare("
            SELECT 
                c.id, c.certificate_code, c.uuid, c.recipient_name, c.recipient_identifier,
                c.participation_role, c.issue_date, c.expiry_date, c.canonical_hash, c.file_hash,
                c.status as cert_status, c.revocation_reason, c.revoked_at,
                e.id as event_id, e.title as event_title, e.category as event_category, e.event_date, e.venue as event_venue,
                u.id as issuer_id, u.organization_name, u.status as issuer_status, u.role as issuer_role
            FROM certificates c
            JOIN events e ON c.event_id = e.id
            JOIN users u ON e.user_id = u.id
            WHERE c.uuid = :ident_uuid OR c.certificate_code = :ident_code
            LIMIT 1
        ");
        $stmt->execute([
            'ident_uuid' => $identifier,
            'ident_code' => $identifier,
        ]);
        $record = $stmt->fetch();

        if (!$record) {
            $result['verdict'] = 'not_found';
            $result['verdict_title'] = 'Certificate Not Found';
            $result['status_class'] = 'status-not-found';
            $result['evidence'][] = 'No certificate record exists matching the specified code or token in the institutional registry.';
            self::logVerification($pdo, null, $identifier, 'not_found', $ipHash, $userAgent);
            return $result;
        }

        $certId = (int)$record['id'];

        // Masked public profile
        $result['certificate'] = [
            'code' => $record['certificate_code'],
            'recipient_name_masked' => Utils::maskName($record['recipient_name']),
            'recipient_name_raw' => $record['recipient_name'], // only exposed if public view permits
            'recipient_identifier' => Utils::maskIdentifier($record['recipient_identifier']),
            'role' => $record['participation_role'],
            'issue_date' => $record['issue_date'],
            'expiry_date' => $record['expiry_date'],
            'canonical_hash' => $record['canonical_hash'],
            'status' => $record['cert_status'],
        ];

        $result['issuer'] = [
            'organization' => $record['organization_name'],
            'status' => $record['issuer_status'],
        ];

        $result['event'] = [
            'title' => $record['event_title'],
            'category' => $record['event_category'],
            'date' => $record['event_date'],
            'venue' => $record['event_venue'],
        ];

        // Step 1: Check Issuer Trust
        if ($record['issuer_status'] !== 'approved') {
            $result['verdict'] = 'untrusted_issuer';
            $result['verdict_title'] = 'Untrusted Issuer';
            $result['status_class'] = 'status-untrusted';
            $result['evidence'][] = "The issuing organization '{$record['organization_name']}' is not currently in good standing or authorized status ({$record['issuer_status']}).";
            self::logVerification($pdo, $certId, $identifier, 'untrusted_issuer', $ipHash, $userAgent);
            return $result;
        }
        $result['evidence'][] = "Issuer '{$record['organization_name']}' is an authorized institution in good standing.";

        // Step 2: Check Revocation Status
        if ($record['cert_status'] === 'revoked') {
            $result['verdict'] = 'revoked';
            $result['verdict_title'] = 'Certificate Revoked';
            $result['status_class'] = 'status-revoked';
            $revokedAt = $record['revoked_at'] ? date('M d, Y H:i', strtotime($record['revoked_at'])) : 'Unknown date';
            $result['evidence'][] = "Revoked by issuer on {$revokedAt}.";
            $result['evidence'][] = "Reason for revocation: " . ($record['revocation_reason'] ?: 'No reason stated');
            self::logVerification($pdo, $certId, $identifier, 'revoked', $ipHash, $userAgent);
            return $result;
        }
        $result['evidence'][] = "Certificate record is active and has not been revoked.";

        // Step 3: Check Expiry Date
        if (!empty($record['expiry_date']) && strtotime($record['expiry_date']) < strtotime(date('Y-m-d'))) {
            $result['verdict'] = 'expired';
            $result['verdict_title'] = 'Credential Expired';
            $result['status_class'] = 'status-expired';
            $result['evidence'][] = "This certificate reached its validity expiration on {$record['expiry_date']}.";
            self::logVerification($pdo, $certId, $identifier, 'expired', $ipHash, $userAgent);
            return $result;
        }

        // Step 4: Dual-Vector File Integrity Check (if uploaded file hash provided)
        if ($candidateFileHash !== null && $candidateFileHash !== '') {
            $candidateHashClean = strtolower(trim($candidateFileHash));
            $storedFileHash = strtolower(trim((string)$record['file_hash']));

            if ($storedFileHash !== '' && !hash_equals($storedFileHash, $candidateHashClean)) {
                $result['verdict'] = 'tampered';
                $result['verdict_title'] = 'Tampered / File Integrity Mismatch';
                $result['status_class'] = 'status-tampered';
                $result['evidence'][] = "Document integrity check failed: Uploaded file SHA-256 does not match the server-recorded master hash.";
                $result['evidence'][] = "Expected Reference Hash: {$storedFileHash}";
                $result['evidence'][] = "Uploaded File Hash: {$candidateHashClean}";
                self::logVerification($pdo, $certId, $identifier, 'tampered', $ipHash, $userAgent);
                return $result;
            } else {
                $result['evidence'][] = "Bit-level file integrity verified: Uploaded PDF SHA-256 matches exact issued master hash.";
            }
        }

        // Step 5: Confirmed Authentic & Genuine
        $result['verdict'] = 'verified';
        $result['verdict_title'] = 'Verified Genuine';
        $result['status_class'] = 'status-verified';
        $result['is_authentic'] = true;
        $result['evidence'][] = "Unique certificate ID matches official database record.";
        $result['evidence'][] = "Event '{$record['event_title']}' properly bound to issuer.";

        // Scan Telemetry & Replay Detection
        $scanStats = self::getScanTelemetry($pdo, $certId);
        $result['scan_count'] = $scanStats['total_scans'] + 1;
        $result['anomaly_detected'] = $scanStats['frequent_scans'];

        if ($result['anomaly_detected']) {
            $result['evidence'][] = "Notice: This credential has been scanned {$result['scan_count']} times recently. Gatekeepers should check recipient identity.";
        }

        self::logVerification($pdo, $certId, $identifier, 'verified', $ipHash, $userAgent);

        return $result;
    }

    private static function logVerification(
        PDO $pdo,
        ?int $certId,
        string $scannedToken,
        string $verdict,
        string $ipHash,
        ?string $userAgent
    ): void {
        try {
            $stmt = $pdo->prepare("
                INSERT INTO verification_logs (certificate_id, scanned_token, verdict, ip_hash, user_agent)
                VALUES (:cert_id, :token, :verdict, :ip_hash, :ua)
            ");
            $stmt->execute([
                'cert_id' => $certId,
                'token' => substr($scannedToken, 0, 64),
                'verdict' => $verdict,
                'ip_hash' => $ipHash,
                'ua' => substr((string)$userAgent, 0, 255),
            ]);
        } catch (\Throwable $e) {
            error_log("Verification log error: " . $e->getMessage());
        }
    }

    public static function getScanTelemetry(PDO $pdo, int $certId): array
    {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as total_scans,
                   SUM(CASE WHEN scanned_at >= (NOW() - INTERVAL 10 MINUTE) THEN 1 ELSE 0 END) as recent_scans
            FROM verification_logs
            WHERE certificate_id = :id
        ");
        $stmt->execute(['id' => $certId]);
        $row = $stmt->fetch();

        $total = (int)($row['total_scans'] ?? 0);
        $recent = (int)($row['recent_scans'] ?? 0);

        return [
            'total_scans' => $total,
            'recent_scans' => $recent,
            'frequent_scans' => ($recent >= 4), // Flag if scanned 4+ times within 10 minutes (replay suspect)
        ];
    }
}
