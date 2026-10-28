<?php
declare(strict_types=1);

namespace CertiShield;

use PDO;
use RuntimeException;

class CertificateService
{
    /**
     * Create an event under the authenticated organizer's control
     */
    public static function createEvent(
        PDO $pdo,
        int $userId,
        string $title,
        string $category,
        string $eventDate,
        string $venue,
        ?string $description = null
    ): int {
        // Enforce organizer approval state
        $check = $pdo->prepare("SELECT status FROM users WHERE id = :id LIMIT 1");
        $check->execute(['id' => $userId]);
        $status = $check->fetchColumn();
        if ($status !== 'approved') {
            throw new RuntimeException("Organizer account must be approved before creating events.");
        }

        $title = trim($title);
        if ($title === '') {
            throw new RuntimeException("Event title cannot be empty.");
        }

        $uuid = Utils::uuid();
        $stmt = $pdo->prepare("
            INSERT INTO events (uuid, user_id, title, category, event_date, venue, description)
            VALUES (:uuid, :user_id, :title, :category, :event_date, :venue, :description)
        ");
        $stmt->execute([
            'uuid' => $uuid,
            'user_id' => $userId,
            'title' => $title,
            'category' => trim($category) ?: 'Hackathon',
            'event_date' => $eventDate,
            'venue' => trim($venue),
            'description' => $description ? trim($description) : null,
        ]);

        $eventId = (int)$pdo->lastInsertId();
        Auth::logAudit($pdo, $userId, 'create_event', 'events', (string)$eventId, "Created event '{$title}'");

        return $eventId;
    }

    /**
     * Check if user owns or controls this event
     */
    public static function assertEventOwnership(PDO $pdo, int $userId, int $eventId): array
    {
        $stmt = $pdo->prepare("
            SELECT e.*, u.organization_name, u.status as user_status 
            FROM events e 
            JOIN users u ON e.user_id = u.id 
            WHERE e.id = :event_id LIMIT 1
        ");
        $stmt->execute(['event_id' => $eventId]);
        $event = $stmt->fetch();

        if (!$event) {
            throw new RuntimeException("Event not found.");
        }

        if ((int)$event['user_id'] !== $userId) {
            throw new RuntimeException("Unauthorized: You do not have permission to manage this event.");
        }

        if ($event['user_status'] !== 'approved') {
            throw new RuntimeException("Organizer account is not currently approved.");
        }

        return $event;
    }

    /**
     * Issue a single certificate with cryptographic payload hash & verification token
     */
    public static function issueCertificate(
        PDO $pdo,
        int $userId,
        int $eventId,
        string $recipientName,
        string $recipientEmail,
        ?string $recipientIdentifier = null,
        string $role = 'Participant',
        ?string $issueDate = null,
        ?string $expiryDate = null
    ): array {
        $event = self::assertEventOwnership($pdo, $userId, $eventId);

        $recipientName = trim($recipientName);
        $recipientEmail = strtolower(trim($recipientEmail));
        if ($recipientName === '') {
            throw new RuntimeException("Recipient name is required.");
        }
        if (!filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException("Invalid recipient email format.");
        }

        $issueDate = $issueDate ?: date('Y-m-d');
        $certificateCode = Utils::generateCertificateCode('GPH-26');
        $tokenUuid = Utils::uuid();

        // Compute Canonical Hash of verified fields
        $canonicalPayload = [
            'certificate_code' => $certificateCode,
            'event_title' => $event['title'],
            'organization_name' => $event['organization_name'],
            'recipient_name' => $recipientName,
            'recipient_email' => $recipientEmail,
            'recipient_identifier' => $recipientIdentifier ? trim($recipientIdentifier) : '',
            'role' => $role,
            'issue_date' => $issueDate,
        ];
        $canonicalHash = Utils::canonicalHash($canonicalPayload);

        // Compute reference document hash (simulating generated digital artifact hash)
        $simulatedDocumentContent = json_encode($canonicalPayload) . '|SIGNED_BY_CERTISHIELD_KEY';
        $fileHash = hash('sha256', $simulatedDocumentContent);

        $stmt = $pdo->prepare("
            INSERT INTO certificates 
            (certificate_code, uuid, event_id, recipient_name, recipient_email, recipient_identifier, participation_role, issue_date, expiry_date, canonical_hash, file_hash, status)
            VALUES 
            (:code, :uuid, :event_id, :name, :email, :identifier, :role, :issue_date, :expiry_date, :canonical_hash, :file_hash, 'active')
        ");
        $stmt->execute([
            'code' => $certificateCode,
            'uuid' => $tokenUuid,
            'event_id' => $eventId,
            'name' => $recipientName,
            'email' => $recipientEmail,
            'identifier' => $recipientIdentifier ? trim($recipientIdentifier) : null,
            'role' => trim($role) ?: 'Participant',
            'issue_date' => $issueDate,
            'expiry_date' => $expiryDate ? $expiryDate : null,
            'canonical_hash' => $canonicalHash,
            'file_hash' => $fileHash,
        ]);

        $certId = (int)$pdo->lastInsertId();

        Auth::logAudit(
            $pdo,
            $userId,
            'issue_certificate',
            'certificates',
            (string)$certId,
            "Issued certificate {$certificateCode} for {$recipientName} in event '{$event['title']}'"
        );

        return [
            'id' => $certId,
            'certificate_code' => $certificateCode,
            'token' => $tokenUuid,
            'recipient_name' => $recipientName,
            'canonical_hash' => $canonicalHash,
            'file_hash' => $fileHash,
        ];
    }

    /**
     * Batch issue certificates from CSV data safely inside a transaction
     */
    public static function batchIssueFromCsv(PDO $pdo, int $userId, int $eventId, string $csvContent): array
    {
        self::assertEventOwnership($pdo, $userId, $eventId);

        $lines = preg_split('/\r\n|\r|\n/', trim($csvContent));
        if (empty($lines)) {
            throw new RuntimeException("CSV is empty.");
        }

        $header = str_getcsv(array_shift($lines));
        $headerMap = array_flip(array_map('trim', array_map('strtolower', $header)));

        if (!isset($headerMap['name']) || !isset($headerMap['email'])) {
            throw new RuntimeException("CSV header must include at least 'name' and 'email' columns.");
        }

        $issued = [];
        $pdo->beginTransaction();
        try {
            foreach ($lines as $lineNum => $line) {
                if (trim($line) === '') continue;
                $row = str_getcsv($line);
                $name = $row[$headerMap['name']] ?? '';
                $email = $row[$headerMap['email']] ?? '';
                $role = isset($headerMap['role']) ? ($row[$headerMap['role']] ?? 'Participant') : 'Participant';
                $rollNo = isset($headerMap['roll_no']) ? ($row[$headerMap['roll_no']] ?? null) : null;

                if (trim($name) === '' || trim($email) === '') {
                    continue;
                }

                $issued[] = self::issueCertificate(
                    $pdo,
                    $userId,
                    $eventId,
                    $name,
                    $email,
                    $rollNo,
                    $role
                );
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        return $issued;
    }

    /**
     * Revoke a certificate immediately
     */
    public static function revokeCertificate(PDO $pdo, int $userId, int $certificateId, string $reason): void
    {
        // Check ownership through event
        $stmt = $pdo->prepare("
            SELECT c.*, e.user_id, e.title as event_title 
            FROM certificates c 
            JOIN events e ON c.event_id = e.id 
            WHERE c.id = :id LIMIT 1
        ");
        $stmt->execute(['id' => $certificateId]);
        $cert = $stmt->fetch();

        if (!$cert) {
            throw new RuntimeException("Certificate not found.");
        }

        // Must be organizer of that event or platform admin
        $user = Auth::getCurrentUser();
        $isAdmin = ($user && $user['role'] === 'admin');

        if (!$isAdmin && (int)$cert['user_id'] !== $userId) {
            throw new RuntimeException("Unauthorized: You do not have permission to revoke this certificate.");
        }

        $reason = trim($reason);
        if ($reason === '') {
            throw new RuntimeException("A valid revocation reason must be provided.");
        }

        $upd = $pdo->prepare("
            UPDATE certificates 
            SET status = 'revoked', revocation_reason = :reason, revoked_at = NOW(), revoked_by = :user_id 
            WHERE id = :id
        ");
        $upd->execute([
            'reason' => $reason,
            'user_id' => $userId,
            'id' => $certificateId,
        ]);

        Auth::logAudit(
            $pdo,
            $userId,
            'revoke_certificate',
            'certificates',
            (string)$certificateId,
            "Revoked certificate {$cert['certificate_code']} (Reason: {$reason})"
        );
    }
}
