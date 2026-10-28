import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Upload, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileCheck2,
  Calendar,
  Building,
  User,
  Hash
} from 'lucide-react';

interface PublicVerifierProps {
  initialCode?: string;
  autoTamper?: boolean;
}

export const PublicVerifier: React.FC<PublicVerifierProps> = ({ initialCode = '', autoTamper = false }) => {
  const [identifier, setIdentifier] = useState(initialCode);
  const [fileHash, setFileHash] = useState<string | null>(autoTamper ? 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' : null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialCode) {
      setIdentifier(initialCode);
      handleVerify(initialCode, autoTamper ? 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' : null);
    }
  }, [initialCode, autoTamper]);

  const handleVerify = async (codeToVerify: string, candidateHash?: string | null) => {
    const clean = codeToVerify.trim();
    if (!clean) return;

    setLoading(true);
    setError(null);
    try {
      let url = `http://localhost:5000/api/public/verify/${encodeURIComponent(clean)}`;
      if (candidateHash) {
        url += `?file_hash=${encodeURIComponent(candidateHash)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'success') {
        setResult(data.data);
      } else {
        setError(data.error || 'Verification query failed.');
      }
    } catch (err: any) {
      setError('Cannot connect to CertiShield backend server. Ensure backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    setFileHash(hashHex);

    if (identifier) {
      handleVerify(identifier, hashHex);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Search Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-8">
        <div className="text-center max-w-xl mx-auto mb-6">
          <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Institutional Credential Verifier
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Friction-free, account-free verification for employers, recruiters, and gatekeepers.
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleVerify(identifier, fileHash); }}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Enter Certificate ID (e.g. GPH-26-8F29A or QR Token)"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify Credential'}
            </button>
          </div>

          {/* Dual-Vector Tamper Upload Section */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-indigo-500" />
              <span>Signature Differentiator: Drop certificate file to test bit-level SHA-256 integrity</span>
            </div>
            <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition">
              <Upload className="w-3.5 h-3.5" />
              <span>{fileHash ? 'File Hash Attached' : 'Attach PDF/SVG'}</span>
              <input type="file" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center gap-3 mb-6">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Result Display Box */}
      {result && (
        <div className="space-y-6">
          <div
            className={`rounded-2xl p-6 sm:p-8 text-center border-2 transition ${
              result.verdict === 'verified'
                ? 'bg-emerald-50/60 border-emerald-500 text-emerald-900'
                : result.verdict === 'revoked'
                ? 'bg-rose-50/60 border-rose-500 text-rose-900'
                : result.verdict === 'expired'
                ? 'bg-amber-50/60 border-amber-500 text-amber-900'
                : result.verdict === 'tampered'
                ? 'bg-pink-50/60 border-pink-500 text-pink-900'
                : 'bg-slate-50 border-slate-400 text-slate-900'
            }`}
          >
            <div className="flex justify-center mb-3">
              {result.verdict === 'verified' && <CheckCircle2 className="w-14 h-14 text-emerald-600" />}
              {result.verdict === 'revoked' && <XCircle className="w-14 h-14 text-rose-600" />}
              {result.verdict === 'expired' && <Clock className="w-14 h-14 text-amber-600" />}
              {result.verdict === 'tampered' && <AlertTriangle className="w-14 h-14 text-pink-600" />}
              {result.verdict === 'not_found' && <Search className="w-14 h-14 text-slate-500" />}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black mb-2">
              {result.verdict_title}
            </h2>

            {result.anomaly_detected && (
              <div className="inline-block bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full mb-4 border border-amber-300">
                🚨 Replay Alert: Scanned {result.scan_count} times recently. Verify photo ID to prevent pass-backs.
              </div>
            )}

            {/* Evidence Checklist */}
            <div className="max-w-xl mx-auto bg-white/90 rounded-xl p-4 text-left border border-slate-200/80 shadow-sm mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Official Evidence Evaluation Chain:
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {result.evidence.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">&bull;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Certificate Payload Details (Privacy Protected) */}
          {result.certificate && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">
                  Verified Credential Record
                </h3>
                {result.verdict === 'verified' && (
                  <button
                    onClick={() => {
                      // Trigger view certificate modal
                      const event = new CustomEvent('open-cert-modal', {
                        detail: {
                          certificate_code: result.certificate.code,
                          recipient_name: result.certificate.recipient_name_raw,
                          participation_role: result.certificate.role,
                          event_title: result.event?.title,
                          issue_date: result.certificate.issue_date,
                        },
                      });
                      window.dispatchEvent(event);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
                  >
                    <span>🖨️ View Official Certificate &amp; QR</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block font-semibold uppercase">Recipient Name</span>
                  <span className="font-bold text-slate-900 text-base">
                    {result.certificate.recipient_name_raw}
                  </span>
                  <span className="text-xs text-slate-500 block">
                    (Publicly Masked: {result.certificate.recipient_name_masked})
                  </span>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block font-semibold uppercase">Event Title</span>
                  <span className="font-bold text-slate-900 text-base">
                    {result.event?.title}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block font-semibold uppercase">Role / Recognition</span>
                  <span className="font-semibold text-blue-600">
                    {result.certificate.role}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block font-semibold uppercase">Issuing Institution</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span>{result.institution?.name}</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                      Vetted Issuer
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block font-semibold uppercase">Unique Certificate ID</span>
                  <span className="font-mono font-bold text-slate-800">
                    {result.certificate.code}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block font-semibold uppercase">Issue Date</span>
                  <span className="font-semibold text-slate-700">
                    {result.certificate.issue_date}
                  </span>
                </div>

                <div className="md:col-span-2">
                  <span className="text-xs text-slate-400 block font-semibold uppercase">Canonical SHA-256 Hash</span>
                  <div className="font-mono text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-600 break-all">
                    {result.certificate.canonical_hash}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
