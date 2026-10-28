import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Building2, 
  Calendar, 
  Printer, 
  ArrowLeft,
  FileCheck,
  Award,
  ExternalLink
} from 'lucide-react';
import { CertificateTemplateRenderer } from './CertificateTemplates';

interface StandaloneCertificateViewProps {
  code: string;
  onBack: () => void;
}

export const StandaloneCertificateView: React.FC<StandaloneCertificateViewProps> = ({ code, onBack }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/verify/${encodeURIComponent(code)}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.status === 'success') {
          setData(d.data);
        } else {
          setError(d.error || 'Certificate record not found.');
        }
      })
      .catch(() => {
        setError('Cannot connect to credential verification registry.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a12] text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-emerald-400 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-300 font-medium text-sm">Verifying credential against official institutional registry...</p>
      </div>
    );
  }

  const cert = data?.certificate;
  const inst = data?.institution;
  const event = data?.event;
  const isVerified = data?.verdict === 'verified';
  const isRevoked = data?.verdict === 'revoked';
  const isTampered = data?.verdict === 'tampered';

  return (
    <div className="min-h-screen bg-[#080a12] text-slate-100 flex flex-col justify-between py-6 px-4 sm:px-6">
      {/* Top Status Bar */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <div>
            <span className="font-bold text-white text-sm block">Official Credential Verification</span>
            <span className="text-[11px] text-slate-400 font-mono">ID: {code}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            onClick={onBack}
            className="text-slate-400 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Portal Home</span>
          </button>
        </div>
      </div>

      {/* Main Certificate Display Area */}
      <div className="max-w-3xl mx-auto w-full my-6">
        {/* Verification Verdict Banner */}
        <div
          className={`p-4 rounded-2xl mb-6 border flex items-center gap-3.5 shadow-lg ${
            isVerified
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : isRevoked
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
          }`}
        >
          {isVerified && <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />}
          {isRevoked && <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0" />}
          {!isVerified && !isRevoked && <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />}

          <div className="text-xs sm:text-sm">
            <span className="font-black uppercase tracking-wider block">
              {data?.verdict_title || (error ? 'Verification Failed' : 'Registry Status')}
            </span>
            <p className="text-slate-200 mt-0.5 leading-relaxed">
              {isVerified && 'This credential is authentic, active, and verified directly from the institutional master registry.'}
              {isRevoked && `This certificate was revoked. Reason: ${data?.evidence?.find((e: string) => e.includes('Revocation reason')) || 'Disqualified by issuing institution'}`}
              {isTampered && 'Integrity check failed: Digital document hash does not match original issuance record.'}
              {error && error}
            </p>
          </div>
        </div>

        {/* The Printable Official Certificate Canvas */}
        {cert && (
          <CertificateTemplateRenderer
            cert={{
              ...cert,
              template_id: cert.template_id || 'plain_professional',
            }}
            institutionName={inst?.name}
            eventTitle={event?.title}
            qrElement={
              <div className="text-center p-3 rounded-2xl border border-slate-300 bg-slate-50 flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-emerald-700 font-black text-xs uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Verified Authentic</span>
                </div>
                <span className="font-mono text-[9px] text-slate-500 mt-0.5">
                  ID: {cert.code}
                </span>
                <span className="font-mono text-[8px] text-slate-400 mt-0.5 max-w-[140px] truncate">
                  SHA-256: {cert.canonical_hash?.slice(0, 20)}...
                </span>
              </div>
            }
          />
        )}
      </div>

      {/* Footer */}
      <div className="max-w-3xl mx-auto w-full text-center text-xs text-slate-500 pt-4 border-t border-slate-800">
        <span>CertiShield Credential Verification &bull; Verified against Official Institutional Registry</span>
      </div>
    </div>
  );
};
