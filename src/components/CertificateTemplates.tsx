import React from 'react';
import { ShieldCheck } from 'lucide-react';

export interface CertificateRenderProps {
  cert: {
    recipient_name?: string;
    recipient_name_raw?: string;
    participation_role?: string;
    role?: string;
    event_title?: string;
    certificate_code?: string;
    code?: string;
    issue_date?: string;
    canonical_hash?: string;
    authorized_rep_name?: string;
    institution_name?: string;
    organization_name?: string;
    status?: string;
  };
  institutionName?: string;
  eventTitle?: string;
  qrUrl?: string;
  qrElement?: React.ReactNode;
  showVerificationBadge?: boolean;
}

/**
 * Standard Professional Certificate Design
 * Consistent across: Saved Certificate, Printable/PDF version, and Public QR scan page.
 * Keeps father's name private (never exposed on public certificate or QR).
 */
export const CertificateTemplateRenderer: React.FC<CertificateRenderProps> = ({
  cert,
  institutionName,
  eventTitle,
  qrUrl,
  qrElement,
}) => {
  const recipientName = cert.recipient_name_raw || cert.recipient_name || 'Honored Recipient';
  const role = cert.participation_role || cert.role || 'Participant';
  const event = eventTitle || cert.event_title || 'Institutional Achievement';
  const institution = institutionName || cert.institution_name || cert.organization_name || 'Issuing Institution';
  const issueDate = cert.issue_date || new Date().toISOString().split('T')[0];
  const signatory = cert.authorized_rep_name || institution;
  const shortHash = cert.canonical_hash ? cert.canonical_hash.substring(0, 24) + '...' : 'AUTHENTIC_REGISTRY';

  const renderedQr = qrElement ? (
    qrElement
  ) : qrUrl ? (
    <div className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-sm flex items-center justify-center flex-shrink-0">
      <img
        src={qrUrl}
        alt="Verification QR Code"
        className="w-28 h-28 sm:w-32 sm:h-32 block object-contain"
      />
    </div>
  ) : null;

  return (
    <div
      id="printable-cert"
      className="relative bg-gradient-to-b from-[#fdfbf7] via-white to-[#f8f9fa] text-slate-900 rounded-3xl p-6 sm:p-11 shadow-2xl border-8 border-double border-slate-800 text-center overflow-hidden transition-all"
    >
      {/* Background Seal Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
        <ShieldCheck className="w-96 h-96 text-slate-900" />
      </div>

      {/* Header Badge */}
      <div className="flex items-center justify-center gap-2 text-blue-800 font-bold text-xs uppercase tracking-widest mb-3">
        <ShieldCheck className="w-4 h-4 text-blue-700" />
        <span>Institutional Credential Registry &bull; CertiShield</span>
      </div>

      <h1 className="text-2xl sm:text-4xl font-serif font-black tracking-tight text-slate-900 mb-2">
        CERTIFICATE OF ACHIEVEMENT
      </h1>
      <p className="text-xs text-slate-500 italic mb-5 font-serif">
        This is to officially certify that
      </p>

      {/* Recipient Name Box */}
      <div className="text-2xl sm:text-3xl font-serif font-extrabold text-blue-950 border-b-2 border-slate-300 pb-2 max-w-md mx-auto mb-4 tracking-tight">
        {recipientName}
      </div>

      {/* Participation & Event Details */}
      <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mb-2 leading-relaxed">
        has successfully fulfilled required credentials and earned official recognition as{' '}
        <span className="font-bold text-slate-900 bg-slate-200/80 px-2 py-0.5 rounded">{role}</span> in
      </p>

      <h3 className="text-lg sm:text-2xl font-serif font-bold text-slate-900 mb-6">
        {event}
      </h3>

      {/* Signatures & Clean QR Code */}
      <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6 pt-6 border-t border-slate-200 text-left text-xs">
        <div className="text-center sm:text-left space-y-0.5">
          <div className="font-serif font-bold text-slate-800 text-sm">
            {signatory}
          </div>
          <div className="text-[11px] text-slate-500">
            Authorized Signatory &bull; {institution}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Issue Date: {issueDate}</div>
          <div className="text-[9px] text-slate-400 font-mono mt-0.5 max-w-[200px] truncate">
            Hash: {shortHash}
          </div>
        </div>

        <div className="flex flex-col items-center">
          {renderedQr}
        </div>
      </div>
    </div>
  );
};
