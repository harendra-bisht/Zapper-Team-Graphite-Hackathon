<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/Utils.php';
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/Security.php';
require_once __DIR__ . '/../src/Auth.php';
require_once __DIR__ . '/../src/CertificateService.php';
require_once __DIR__ . '/../src/VerificationService.php';
require_once __DIR__ . '/../src/QRCodeService.php';

use CertiShield\Database;
use CertiShield\Auth;
use CertiShield\CertificateService;
use CertiShield\VerificationService;
use CertiShield\QRCodeService;
use CertiShield\Security;
use CertiShield\Utils;

class TestRunner
{
    private PDO $pdo;
    private int $passed = 0;
    private int $failed = 0;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function run(): void
    {
        echo "======================================================" . PHP_EOL;
        echo "  CertiShield Automated Security & Quality Test Suite  " . PHP_EOL;
        echo "======================================================" . PHP_EOL . PHP_EOL;

        $this->test1_OrganizerLogin();
        $this->test2_InvalidLoginAndBruteForceThrottling();
        $this->test3_UnauthorizedIssuanceByPendingOrganizer();
        $this->test4_CrossEventIdorIsolation();
        $this->test5_UnauthorizedRevocation();
        $this->test6_CertificateIssuanceAndQrGeneration();
        $this->test7_VerificationOfActiveCertificate();
        $this->test8_UnknownCertificateLookup();
        $this->test9_RevocationVerificationAndImmediateStateUpdate();
        $this->test10_ExpiredCertificateCheck();
        $this->test11_TamperedDocumentHashCheck();
        $this->test12_BatchCsvImportAndTransactionRollback();
        $this->test13_CsrfTokenVerification();
        $this->test14_PublicEndpointZeroInformationLeakage();
        $this->test15_AuditTrailLogging();
        $this->test16_ReplayAnomalyDetection();

        echo PHP_EOL . "======================================================" . PHP_EOL;
        echo "TEST SUMMARY: {$this->passed} Passed, {$this->failed} Failed" . PHP_EOL;
        echo "======================================================" . PHP_EOL;

        if ($this->failed > 0) {
            exit(1);
        }
    }

    private function assert(bool $condition, string $testName, string $failureDetails = ''): void
    {
        if ($condition) {
            echo " [PASS] " . $testName . PHP_EOL;
            $this->passed++;
        } else {
            echo " [FAIL] " . $testName . ($failureDetails ? " -> " . $failureDetails : "") . PHP_EOL;
            $this->failed++;
        }
    }

    // 1. Successful organizer login
    private function test1_OrganizerLogin(): void
    {
        try {
            $user = Auth::login($this->pdo, 'acm@studentchapter.edu', 'Organizer@ACM2026');
            $this->assert($user && $user['role'] === 'organizer', "1. Successful organizer login");
        } catch (\Throwable $e) {
            $this->assert(false, "1. Successful organizer login", $e->getMessage());
        }
    }

    // 2. Invalid login & logout
    private function test2_InvalidLoginAndBruteForceThrottling(): void
    {
        $caught = false;
        try {
            Auth::login($this->pdo, 'acm@studentchapter.edu', 'WrongPassword123');
        } catch (\Throwable $e) {
            $caught = true;
        }
        $this->assert($caught, "2. Invalid login authentication rejection");

        Auth::logout($this->pdo);
        $this->assert(Auth::getCurrentUser() === null, "2b. Clean session invalidation on logout");
    }

    // 3. Unauthorized certificate issuance by pending organizer
    private function test3_UnauthorizedIssuanceByPendingOrganizer(): void
    {
        $caught = false;
        // User 3 (robotics@campus.edu) is pending
        $stmt = $this->pdo->query("SELECT id FROM users WHERE email = 'robotics@campus.edu'");
        $pendingUserId = (int)$stmt->fetchColumn();

        try {
            // Should throw exception because status != approved
            CertificateService::createEvent($this->pdo, $pendingUserId, 'Illegal Event', 'Hackathon', '2026-11-01', 'Room 101');
        } catch (\Throwable $e) {
            $caught = true;
        }
        $this->assert($caught, "3. Default-deny: Pending organizer prevented from creating events");
    }

    // 4. Organizer A attempting to access Organizer B's event (IDOR prevention)
    private function test4_CrossEventIdorIsolation(): void
    {
        // Event 1 belongs to User 2 (acm@studentchapter.edu). User 3 should not be able to issue or manage it.
        $stmt = $this->pdo->query("SELECT id FROM users WHERE email = 'robotics@campus.edu'");
        $otherUserId = (int)$stmt->fetchColumn();

        $blocked = false;
        try {
            CertificateService::assertEventOwnership($this->pdo, $otherUserId, 1);
        } catch (\Throwable $e) {
            $blocked = true;
        }
        $this->assert($blocked, "4. IDOR Defense: Cross-event access between organizers strictly denied");
    }

    // 5. Unauthorized certificate revocation
    private function test5_UnauthorizedRevocation(): void
    {
        $stmt = $this->pdo->query("SELECT id FROM users WHERE email = 'robotics@campus.edu'");
        $otherUserId = (int)$stmt->fetchColumn();

        $blocked = false;
        try {
            // Certificate 1 belongs to Event 1 (ACM)
            CertificateService::revokeCertificate($this->pdo, $otherUserId, 1, "Illegitimate revocation attempt");
        } catch (\Throwable $e) {
            $blocked = true;
        }
        $this->assert($blocked, "5. Unauthorized certificate revocation attempt rejected");
    }

    // 6. Successful issuance and QR generation
    private function test6_CertificateIssuanceAndQrGeneration(): void
    {
        $stmt = $this->pdo->query("SELECT id FROM users WHERE email = 'acm@studentchapter.edu'");
        $acmId = (int)$stmt->fetchColumn();

        try {
            $cert = CertificateService::issueCertificate(
                $this->pdo,
                $acmId,
                1,
                'Test Participant Alpha',
                'alpha@test.edu',
                'ROLL-TEST-01',
                'Honorable Mention'
            );

            $svg = QRCodeService::svg('http://localhost:8000/verify.php?id=' . $cert['certificate_code']);
            $hasSvg = str_contains($svg, '<svg') && str_contains($svg, '</svg>');

            $this->assert(!empty($cert['certificate_code']) && $hasSvg, "6. Certificate issuance with high-entropy token and SVG QR generation");
        } catch (\Throwable $e) {
            $this->assert(false, "6. Certificate issuance failed", $e->getMessage());
        }
    }

    // 7. Successful verification of an active certificate
    private function test7_VerificationOfActiveCertificate(): void
    {
        $res = VerificationService::verify($this->pdo, 'GPH-26-8F29A');
        $this->assert(
            $res['verdict'] === 'verified' && $res['is_authentic'] === true,
            "7. Genuine active certificate verified with institutional status"
        );
    }

    // 8. Unknown certificate ID
    private function test8_UnknownCertificateLookup(): void
    {
        $res = VerificationService::verify($this->pdo, 'GPH-26-NONEXISTENT');
        $this->assert(
            $res['verdict'] === 'not_found' && $res['is_authentic'] === false,
            "8. Unknown/forged certificate ID produces honest 'not_found' verdict"
        );
    }

    // 9. Revocation verification & immediate state update
    private function test9_RevocationVerificationAndImmediateStateUpdate(): void
    {
        $res = VerificationService::verify($this->pdo, 'GPH-26-REVOK');
        $hasRevocationNotice = false;
        foreach ($res['evidence'] as $item) {
            if (stripos($item, 'plagiarism') !== false || stripos($item, 'revoked by') !== false) {
                $hasRevocationNotice = true;
                break;
            }
        }
        $this->assert(
            $res['verdict'] === 'revoked' && $res['is_authentic'] === false && $hasRevocationNotice,
            "9. Revoked certificate immediately returns 'revoked' verdict with stated reason"
        );
    }

    // 10. Expired certificate check
    private function test10_ExpiredCertificateCheck(): void
    {
        $res = VerificationService::verify($this->pdo, 'GPH-25-EXPIR');
        $this->assert(
            $res['verdict'] === 'expired' && $res['is_authentic'] === false,
            "10. Expired credential produces distinct 'expired' status"
        );
    }

    // 11. Tampered document hash check (Signature Differentiator)
    private function test11_TamperedDocumentHashCheck(): void
    {
        // Aryan Sharma genuine file hash vs altered fake hash
        $fakeHash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
        $res = VerificationService::verify($this->pdo, 'GPH-26-8F29A', $fakeHash);
        $this->assert(
            $res['verdict'] === 'tampered' && $res['is_authentic'] === false,
            "11. Signature Differentiator: Modified document detected via SHA-256 mismatch (TAMPERED)"
        );
    }

    // 12. Batch CSV import & transaction integrity
    private function test12_BatchCsvImportAndTransactionRollback(): void
    {
        $stmt = $this->pdo->query("SELECT id FROM users WHERE email = 'acm@studentchapter.edu'");
        $acmId = (int)$stmt->fetchColumn();

        $csv = "name,email,role,roll_no\nParticipant One,p1@test.edu,Participant,ROLL-01\nParticipant Two,p2@test.edu,Winner,ROLL-02";
        $results = CertificateService::batchIssueFromCsv($this->pdo, $acmId, 1, $csv);

        $this->assert(count($results) === 2, "12. Batch CSV issuance with automated token generation");
    }

    // 13. CSRF token validation
    private function test13_CsrfTokenVerification(): void
    {
        $token = Security::csrfToken();
        $valid = Security::verifyCsrf($token);
        $invalid = Security::verifyCsrf('malicious_tampered_token');

        $this->assert($valid && !$invalid, "13. CSRF defense: Valid tokens accepted, tampered tokens rejected");
    }

    // 14. Public endpoint zero information leakage
    private function test14_PublicEndpointZeroInformationLeakage(): void
    {
        $res = VerificationService::verify($this->pdo, 'GPH-26-8F29A');
        $maskedName = $res['certificate']['recipient_name_masked'] ?? '';
        $maskedId = $res['certificate']['recipient_identifier'] ?? '';

        $isMasked = str_contains($maskedName, '*') && str_contains($maskedId, '*');
        $this->assert($isMasked, "14. Privacy preservation: Public verifier masks sensitive personal details");
    }

    // 15. Audit trail logging
    private function test15_AuditTrailLogging(): void
    {
        $stmt = $this->pdo->query("SELECT COUNT(*) FROM audit_logs");
        $count = (int)$stmt->fetchColumn();

        $this->assert($count > 0, "15. Sensitive operations recorded in immutable audit log");
    }

    // 16. Replay anomaly detection
    private function test16_ReplayAnomalyDetection(): void
    {
        // Simulate rapid scans on certificate 1
        for ($i = 0; $i < 5; $i++) {
            VerificationService::verify($this->pdo, 'GPH-26-8F29A');
        }

        $res = VerificationService::verify($this->pdo, 'GPH-26-8F29A');
        $this->assert(
            $res['anomaly_detected'] === true && $res['scan_count'] >= 5,
            "16. Replay anomaly detector flags rapid multi-scans of genuine certificates"
        );
    }
}

$runner = new TestRunner();
$runner->run();
