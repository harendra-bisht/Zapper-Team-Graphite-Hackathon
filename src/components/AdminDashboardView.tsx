import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Search,
  ExternalLink,
  FileText
} from 'lucide-react';

interface AdminDashboardViewProps {
  onOpenPassport?: (targetIdOrDomain: string | number) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onOpenPassport }) => {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/institutions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setInstitutions(data.institutions || []);

      const logRes = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const logData = await logRes.json();
      setAuditLogs(logData.logs || []);
    } catch {
      setError('Failed to load administrative data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleReview = async (instId: number, status: 'approved' | 'rejected') => {
    // 1-Click instant execution without prompt or verification barriers
    const notes = status === 'approved' ? 'Approved by Admin' : 'Refused by Admin';
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/institutions/${instId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, notes })
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg(data.message || `Status updated to ${status}`);
        fetchAdminData();
      } else {
        setError(data.error || 'Failed to update status.');
      }
    } catch {
      setError('Network error processing review.');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-300 font-semibold">Loading Campus Administration Console...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 text-slate-100">
      {/* Top Banner */}
      <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xl">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block mb-1">
            Platform Administration Console
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Campus Registrar &amp; Accreditation Vetting</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Review institution applications, grant issuance credentials, and enforce integrity oversight.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#1e293b] px-4 py-2.5 rounded-2xl border border-slate-600 text-xs font-mono text-emerald-300 font-bold shadow-md">
            Total Institutions: <strong className="text-white text-sm">{institutions.length}</strong>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-2xl text-xs sm:text-sm font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-md">
          ✓ {statusMsg}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl text-xs sm:text-sm font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300 shadow-md">
          ✕ {error}
        </div>
      )}

      {/* Institutions Table */}
      <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
        <h2 className="text-xl font-bold text-white pb-3 border-b border-slate-700 flex items-center justify-between">
          <span>Institution Applications &amp; Issuance Rights</span>
          <span className="text-xs text-slate-300 font-normal">Strict Admin Authorization Required</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#1e293b] text-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Institution / Club</th>
                <th className="py-3 px-4">Lead Rep</th>
                <th className="py-3 px-4">Domain</th>
                <th className="py-3 px-4">Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right rounded-r-xl">Vetting Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {institutions.map((inst) => (
                <tr key={inst.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4">
                    <div 
                      onClick={() => onOpenPassport ? onOpenPassport(inst.id) : undefined}
                      className="font-bold text-white text-sm hover:text-purple-400 cursor-pointer transition"
                      title="Inspect Trust Passport Profile"
                    >
                      {inst.organization_name}
                    </div>
                    <a
                      href={inst.official_website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-purple-400 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <span>{inst.official_website}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-white font-semibold">{inst.authorized_rep_name}</div>
                    <div className="text-xs text-slate-400 font-mono">{inst.email}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-purple-300 text-xs font-semibold">{inst.domain}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-sm">{inst.balance ?? 5} credits</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide inline-flex items-center gap-1 ${
                        inst.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : inst.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {inst.status === 'approved' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      {inst.status === 'pending' && <Clock className="w-3 h-3 text-amber-400" />}
                      {inst.status !== 'approved' && inst.status !== 'pending' && <XCircle className="w-3 h-3 text-rose-400" />}
                      <span>{inst.status}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {inst.status !== 'approved' && (
                        <button
                          onClick={() => handleReview(inst.id, 'approved')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5"
                          title="Instant Accept without further verification"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                      )}
                      {inst.status !== 'rejected' && inst.status !== 'suspended' && (
                        <button
                          onClick={() => handleReview(inst.id, 'rejected')}
                          className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5"
                          title="Instant Refuse without further verification"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Refuse</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Platform Security Audit Trail */}
      <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
        <h2 className="text-xl font-bold text-white pb-3 border-b border-slate-700">
          Platform Security &amp; Activity Audit Log
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1e293b] text-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Client Hash</th>
                <th className="py-3 px-4 rounded-r-xl">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-2.5 px-4 text-xs whitespace-nowrap text-slate-400">{log.created_at}</td>
                  <td className="py-2.5 px-4 text-purple-400 font-bold">{log.action}</td>
                  <td className="py-2.5 px-4 text-white">{log.target_type} #{log.target_id}</td>
                  <td className="py-2.5 px-4 text-slate-400">{log.ip_address}</td>
                  <td className="py-2.5 px-4 font-sans text-slate-100 text-xs">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
