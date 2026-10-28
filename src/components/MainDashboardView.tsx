import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Award, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  Printer, 
  FileCheck, 
  Users, 
  QrCode,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Activity,
  Coins,
  Receipt,
  PlusCircle
} from 'lucide-react';

interface MainDashboardViewProps {
  onNavigate: (view: 'dashboard' | 'verify' | 'hub' | 'admin' | 'passport' | 'pricing') => void;
  onVerifyCode: (code: string) => void;
  onViewCert: (cert: any) => void;
  onOpenPassport?: (targetIdOrDomain: string | number) => void;
  user: any;
}

export const MainDashboardView: React.FC<MainDashboardViewProps> = ({
  onNavigate,
  onVerifyCode,
  onViewCert,
  onOpenPassport,
  user,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quickInput, setQuickInput] = useState('');

  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/public/platform-overview');
      const d = await res.json();
      setData(d);
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleQuickVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickInput.trim()) {
      onVerifyCode(quickInput.trim());
    }
  };

  const stats = data?.stats || {
    total_certificates: 142,
    active_certificates: 128,
    revoked_certificates: 14,
    expired_certificates: 4,
    total_institutions: 3,
    approved_institutions: 2,
    total_scans: 30,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 text-slate-100">
      {/* Hero Welcome & Quick Search Bar */}
      <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            High-Assurance Credential Registry &amp; Verifier
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed max-w-2xl font-medium">
            Real-time verification platform protecting collegiate diplomas, hackathon accolades, and institutional credentials with phone-scannable QR codes and bit-level cryptographic proof.
          </p>

          {/* Quick Verification Search */}
          <form onSubmit={handleQuickVerifySubmit} className="pt-2 max-w-xl">
            <div className="bg-[#0b0f19] border border-slate-700 focus-within:border-purple-500 rounded-2xl p-2 flex items-center gap-2 shadow-lg transition">
              <Search className="w-5 h-5 text-slate-400 ml-3 flex-shrink-0" />
              <input
                type="text"
                placeholder="Enter Certificate ID to verify (e.g. CS-2026-8K2P-9M4A)..."
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                className="w-full bg-transparent text-white placeholder-slate-400 text-sm sm:text-base px-2 py-2 focus:outline-none font-mono"
              />
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition flex items-center gap-1.5 shadow-sm flex-shrink-0"
              >
                <span>Verify</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Quick Action Bar for Issuance & Management */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('hub')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Issue Certificate</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('hub')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Event</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('verify')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition"
            >
              <Search className="w-4 h-4" />
              <span>Manual ID Lookup</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Grid - Clear, Bold, High Contrast */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {/* Metric 1 */}
        <div className="bg-[#111827] border border-slate-700/80 rounded-2xl p-5 shadow-lg hover:border-purple-500/50 transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Total Credentials</span>
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white">
            {stats.total_certificates}
          </div>
          <span className="text-xs font-medium text-purple-300 mt-1 block">
            Cryptographically anchored
          </span>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#111827] border border-slate-700/80 rounded-2xl p-5 shadow-lg hover:border-emerald-500/50 transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Active &amp; Genuine</span>
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-400">
            {stats.active_certificates}
          </div>
          <span className="text-xs font-medium text-emerald-300 mt-1 block">
            Passed all verification checks
          </span>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#111827] border border-slate-700/80 rounded-2xl p-5 shadow-lg hover:border-rose-500/50 transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Revoked / Flagged</span>
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-rose-400">
            {stats.revoked_certificates}
          </div>
          <span className="text-xs font-medium text-rose-300 mt-1 block">
            Revoked with audit reasons
          </span>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#111827] border border-slate-700/80 rounded-2xl p-5 shadow-lg hover:border-sky-500/50 transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Vetted Institutions</span>
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-sky-400">
            {stats.approved_institutions} <span className="text-base text-slate-400 font-normal">/ {stats.total_institutions}</span>
          </div>
          <span className="text-xs font-medium text-sky-300 mt-1 block">
            Accredited issuance authorities
          </span>
        </div>
      </div>

      {/* Portals & Interactive Workflows */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400" />
          <span>Application Portals &amp; Interactive Workflows</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Verifier */}
          <div
            onClick={() => onNavigate('verify')}
            className="bg-[#111827] hover:bg-[#161f36] border border-slate-700/80 hover:border-purple-400 p-6 rounded-2xl transition cursor-pointer shadow-lg space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 bg-purple-500/20 text-purple-300 rounded-xl group-hover:scale-110 transition">
                <Search className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-400 group-hover:translate-x-1 transition" />
            </div>
            <h3 className="text-lg font-bold text-white">Public Verifier</h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              Verify credentials via QR scan or test sample verification scenarios with bit-level file diagnostics.
            </p>
            <span className="text-xs font-bold text-purple-400 inline-block pt-1">
              Open Verifier &rarr;
            </span>
          </div>

          {/* Card 2: Institution Hub */}
          <div
            onClick={() => onNavigate('hub')}
            className="bg-[#111827] hover:bg-[#161f36] border border-slate-700/80 hover:border-emerald-400 p-6 rounded-2xl transition cursor-pointer shadow-lg space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-xl group-hover:scale-110 transition">
                <Award className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
            </div>
            <h3 className="text-lg font-bold text-white">Institution Hub</h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              Manage campus events, issue new certificates (₹0.10 deduction), top-up credits, and trigger revocations.
            </p>
            <span className="text-xs font-bold text-emerald-400 inline-block pt-1">
              Open Hub &rarr;
            </span>
          </div>

          {/* Card 3: Admin Console */}
          <div
            onClick={() => {
              if (user && user.role === 'admin') {
                onNavigate('admin');
              } else {
                onNavigate('admin');
              }
            }}
            className="bg-[#111827] hover:bg-[#161f36] border border-slate-700/80 hover:border-amber-400 p-6 rounded-2xl transition cursor-pointer shadow-lg space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 bg-amber-500/20 text-amber-300 rounded-xl group-hover:scale-110 transition">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-1 transition" />
            </div>
            <h3 className="text-lg font-bold text-white">Campus Registrar</h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              Vet and approve new institution applicants, manage issuance rights, and monitor tamper security logs.
            </p>
            <span className="text-xs font-bold text-amber-400 inline-block pt-1">
              Open Registrar &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* Master Credential Registry Table */}
      <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-400" />
              <span>Official Master Credential Registry</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              All credentials are cryptographically verifiable with instant status updates and tamper detection.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Total Issued: <strong className="text-emerald-400">{data?.recent_certificates?.length || 0}</strong></span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#1e293b] text-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Certificate Code</th>
                <th className="py-3 px-4">Recipient Name</th>
                <th className="py-3 px-4">Event &amp; Role</th>
                <th className="py-3 px-4">Issuing Chapter</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right rounded-r-xl">Verification &amp; QR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {(data?.recent_certificates && data.recent_certificates.length > 0) ? (
                data.recent_certificates.map((cert: any) => (
                  <tr key={cert.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-purple-400">
                      {cert.certificate_code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {cert.recipient_name}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{cert.event_title}</div>
                      <div className="text-[11px] text-slate-400">{cert.participation_role}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      {cert.institution_name}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide inline-flex items-center gap-1 ${
                          cert.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {cert.status === 'active' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Active / Genuine</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-rose-400" />
                            <span>Revoked</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => onVerifyCode(cert.certificate_code)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition inline-flex items-center gap-1"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Verify</span>
                      </button>

                      <button
                        onClick={() => onViewCert(cert)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold px-3 py-1.5 rounded-lg text-xs transition inline-flex items-center gap-1"
                        title="View Official Certificate & Phone QR"
                      >
                        <QrCode className="w-3.5 h-3.5 text-purple-400" />
                        <span>View QR</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <p className="font-semibold text-slate-300">No certificates issued yet.</p>
                    <p className="text-xs text-slate-500 mt-1">Issue your first credential on the spot using the Quick Actions above!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accredited Institutions Row */}
      <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-400" />
              <span>Accredited Collegiate Chapters &amp; Issuers</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Only verified institutions with authenticated campus domains can issue recognized credentials.
            </p>
          </div>
          <button
            onClick={() => onNavigate('passport')}
            className="text-xs text-sky-400 hover:text-sky-300 font-bold underline flex items-center gap-1"
          >
            <span>View Trust Passports</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {data?.institutions?.map((inst: any) => (
            <div
              key={inst.id}
              className="bg-[#1e293b]/60 border border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex justify-between items-start">
                  <h3 
                    onClick={() => onOpenPassport ? onOpenPassport(inst.id) : onNavigate('passport')}
                    className="font-bold text-white text-sm hover:text-purple-400 cursor-pointer transition"
                    title="Click to view verified Trust Passport"
                  >
                    {inst.organization_name}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      inst.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {inst.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-mono mt-1">Domain: {inst.domain}</p>
                <a
                  href={inst.official_website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-sky-400 hover:underline block truncate mt-0.5"
                >
                  {inst.official_website}
                </a>
              </div>

              <button
                onClick={() => onOpenPassport ? onOpenPassport(inst.id) : onNavigate('passport')}
                className="w-full bg-slate-800 hover:bg-purple-600 text-slate-200 hover:text-white border border-slate-600 hover:border-purple-500 py-1.5 rounded-xl text-xs font-bold transition text-center shadow-sm"
              >
                Inspect Trust Passport
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
