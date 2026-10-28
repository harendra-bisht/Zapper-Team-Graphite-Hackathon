<?php
declare(strict_types=1);

namespace CertiShield;

/**
 * Clean, printable SVG Certificate Generator.
 * Embeds official seal, participant details, event context, unique certificate code, and verification QR code.
 */
class PDFService
{
    public static function renderSvgCertificate(array $certData, string $verificationUrl): string
    {
        $code = Utils::e($certData['certificate_code']);
        $name = Utils::e($certData['recipient_name']);
        $eventTitle = Utils::e($certData['event_title']);
        $orgName = Utils::e($certData['organization_name']);
        $role = Utils::e($certData['participation_role'] ?? 'Participant');
        $date = Utils::e($certData['issue_date']);

        $qrSvg = QRCodeService::svg($verificationUrl, 130);

        return <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640" width="100%" height="auto" style="max-width:960px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <defs>
    <linearGradient id="certBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>
    <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="50%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.1"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect x="10" y="10" width="940" height="620" rx="16" fill="url(#certBg)" stroke="url(#goldBorder)" stroke-width="10" filter="url(#shadow)"/>
  <rect x="25" y="25" width="910" height="590" rx="10" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6,4"/>

  <!-- Header & University Badge -->
  <g transform="translate(480, 80)" text-anchor="middle">
    <circle cx="0" cy="0" r="32" fill="#2563eb" opacity="0.1"/>
    <path d="M-14,-10 L0,-20 L14,-10 L14,12 L0,20 L-14,12 Z" fill="#2563eb"/>
    <text y="50" font-size="13" font-weight="700" fill="#2563eb" letter-spacing="4">INSTITUTIONAL CREDENTIAL REGISTRY</text>
    <text y="78" font-size="28" font-weight="800" fill="#0f172a">CERTIFICATE OF PARTICIPATION</text>
  </g>

  <!-- Content -->
  <g transform="translate(480, 210)" text-anchor="middle">
    <text font-size="14" fill="#64748b" font-style="italic">This is to officially certify that</text>
    <text y="42" font-size="34" font-weight="800" fill="#1e293b">{$name}</text>
    <line x1="-220" y1="56" x2="220" y2="56" stroke="#94a3b8" stroke-width="1.5"/>
    <text y="92" font-size="15" fill="#475569">has actively participated as a <tspan font-weight="700" fill="#2563eb">{$role}</tspan> in</text>
    <text y="128" font-size="24" font-weight="700" fill="#0f172a">{$eventTitle}</text>
    <text y="156" font-size="14" fill="#64748b">Organized by <tspan font-weight="600" fill="#334155">{$orgName}</tspan></text>
  </g>

  <!-- Footer Signatures & QR Block -->
  <g transform="translate(70, 470)">
    <line x1="0" y1="50" x2="180" y2="50" stroke="#94a3b8" stroke-width="1.5"/>
    <text x="90" y="70" font-size="13" font-weight="600" fill="#334155" text-anchor="middle">Authorized Signatory</text>
    <text x="90" y="88" font-size="11" fill="#64748b" text-anchor="middle">{$orgName}</text>
  </g>

  <g transform="translate(390, 470)" text-anchor="middle">
    <text x="0" y="40" font-size="12" fill="#64748b">Issue Date</text>
    <text x="0" y="60" font-size="14" font-weight="700" fill="#1e293b">{$date}</text>
    <text x="0" y="85" font-size="11" font-family="monospace" fill="#2563eb">ID: {$code}</text>
  </g>

  <!-- Verification QR Frame -->
  <g transform="translate(740, 440)">
    <rect x="-10" y="-10" width="150" height="150" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
    {$qrSvg}
    <text x="65" y="152" font-size="9" font-weight="600" fill="#64748b" text-anchor="middle">Scan to Verify Authenticity</text>
  </g>
</svg>
SVG;
    }
}
