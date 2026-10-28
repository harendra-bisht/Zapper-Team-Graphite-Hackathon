import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  PlusCircle, 
  Coins, 
  Award, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Sparkles, 
  QrCode,
  CreditCard,
  Receipt,
  Download,
  ArrowRight,
  ShieldCheck,
  Check,
  UserCheck
} from 'lucide-react';

interface InstitutionHubProps {
  user: any;
  onViewCert?: (cert: any) => void;
}

export const InstitutionHub: React.FC<InstitutionHubProps> = ({ user, onViewCert }) => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('custom');

  // Event inputs
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategory, setEventCategory] = useState('Hackathon');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventVenue, setEventVenue] = useState('Campus Auditorium');

  // Certificate inputs
  const [customEventTitle, setCustomEventTitle] = useState('');
  const [recipName, setRecipName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [recipRole, setRecipRole] = useState('Participant');
  const [recipId, setRecipId] = useState('');

  // Recharge inputs
  const [customCredits, setCustomCredits] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [issueLoading, setIssueLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Status message
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/institution/dashboard', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      setDashboard(data);

      const evRes = await fetch('/api/institution/events', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const evData = await evRes.json();
      const loadedEvents = evData.events || [];
      setEvents(loadedEvents);
      if (loadedEvents.length > 0 && selectedEventId === 'custom' && !customEventTitle) {
        setSelectedEventId(String(loadedEvents[0].id));
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to sync institution dashboard.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/institution/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          title: eventTitle,
          category: eventCategory,
          event_date: eventDate,
          venue: eventVenue,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: 'success', text: `Event created: "${data.event.title}"` });
        setShowEventModal(false);
        setEventTitle('');
        fetchDashboardData();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to create event.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Network error creating event.' });
    }
  };

  const handleIssueCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipName.trim()) {
      setStatusMsg({ type: 'error', text: "Please enter the student's name." });
      return;
    }

    const effectiveEventTitle = selectedEventId === 'custom' 
      ? (customEventTitle.trim() || 'Campus Academic Event') 
      : (events.find((ev: any) => String(ev.id) === String(selectedEventId))?.title || 'Campus Event');

    const targetEventId = selectedEventId === 'custom' ? 'custom' : selectedEventId;

    setIssueLoading(true);
    try {
      const res = await fetch(`/api/institution/events/${targetEventId}/certificates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          recipient_name: recipName.trim(),
          father_name: fatherName.trim(),
          event_title: effectiveEventTitle,
          recipient_identifier: recipId.trim(),
          participation_role: recipRole.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({
          type: 'success',
          text: `Certificate issued! Unique Code: ${data.certificate.certificate_code} (Charged ₹0.10 / 1 credit)`,
        });
        setShowCertModal(false);
        setRecipName('');
        setFatherName('');
        setCustomEventTitle('');
        setRecipId('');
        fetchDashboardData();
        if (data.certificate) {
          if (onViewCert) {
            onViewCert(data.certificate);
          } else {
            const event = new CustomEvent('open-cert-modal', { detail: data.certificate });
            window.dispatchEvent(event);
          }
        }
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to issue certificate.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Network error issuing certificate.' });
    } finally {
      setIssueLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const res = await fetch('/api/institution/certificates/export-excel', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CertiShield_Staff_Registry_${Date.now()}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setStatusMsg({ type: 'success', text: 'Excel registry file exported successfully!' });
      } else {
        setStatusMsg({ type: 'error', text: 'Failed to download Excel registry.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Network error exporting Excel registry.' });
    } finally {
      setExportLoading(false);
    }
  };

  const handleRechargeCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    const certsToBuy = parseInt(customCredits, 10);
    if (isNaN(certsToBuy) || certsToBuy < 1) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid number of certificates to create.' });
      return;
    }

    setRechargeLoading(true);
    try {
      const res = await fetch('/api/institution/wallet/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          certificates_count: certsToBuy,
          payment_method: paymentMethod,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowRechargeModal(false);
        setCustomCredits('');
        setStatusMsg({
          type: 'success',
          text: `Recharge Successful! Added ${certsToBuy} certificates for ₹${data.amount_in_rupees.toFixed(2)}. Tax Invoice: ${data.invoice_id}`,
        });
        fetchDashboardData();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Recharge failed.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Network error processing recharge.' });
    } finally {
      setRechargeLoading(false);
    }
  };

  const handleRevoke = async (certId: number) => {
    const reason = prompt('Enter official reason for revoking this certificate:', 'Disqualified for violation');
    if (!reason || !reason.trim()) return;

    try {
      const res = await fetch(`/api/institution/certificates/${certId}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: 'success', text: 'Certificate revoked immediately!' });
        fetchDashboardData();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to revoke certificate.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Network error revoking certificate.' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mr-3"></div>
        <span>Loading Institution Hub...</span>
      </div>
    );
  }

  const currentBalance = dashboard?.wallet?.balance ?? 500;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Org Info */}
      <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg flex-shrink-0">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white">{user.organization_name}</h1>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Approved Issuer
              </span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Authorized Registrar: <strong className="text-slate-200">{user.authorized_rep_name || user.name}</strong> &bull; Domain: <span className="text-purple-300 font-mono">{user.domain}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowCertModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Issue Certificate</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={exportLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg transition disabled:opacity-50"
            title="Download complete registry spreadsheet with student and father names"
          >
            <Download className="w-4 h-4" />
            <span>{exportLoading ? 'Exporting...' : 'Export Excel (.xls)'}</span>
          </button>

          <button
            onClick={() => setShowEventModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg transition"
          >
            <Calendar className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm shadow-md font-semibold ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/15 border border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-white ml-2">✕</button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Wallet Balance */}
        <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Wallet Balance</span>
            <Coins className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white flex items-baseline gap-1.5">
            <span>{dashboard?.wallet?.certificates_available ?? currentBalance}</span>
            <span className="text-xs text-slate-400 font-normal">Certs</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Credits: {(((dashboard?.wallet?.certificates_available ?? currentBalance)) / 10).toFixed(1)} Credits &bull; ₹{(((dashboard?.wallet?.certificates_available ?? currentBalance) * 0.10)).toFixed(2)}
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5 font-semibold">
            ₹1 creates 10 certificates (₹0.10 / cert)
          </div>

          <div className="pt-3">
            <button
              onClick={() => setShowRechargeModal(true)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs font-bold py-2 rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Add Certificates</span>
            </button>
          </div>
        </div>

        {/* Issued Credentials */}
        <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Issued Credentials</span>
            <Award className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {dashboard?.stats?.total_certificates ?? 0}
          </div>
          <div className="text-xs text-emerald-400 mt-1 font-semibold">
            Active: {dashboard?.stats?.active_certificates ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Revoked: {dashboard?.stats?.revoked_certificates ?? 0}
          </div>
        </div>

        {/* Campus Events */}
        <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Campus Events</span>
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {events.length}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Registered &amp; Managed
          </div>
          <div className="text-[11px] text-purple-300 mt-0.5 font-medium">
            Custom events supported on the fly
          </div>
        </div>

        {/* Excel Registry Export Card */}
        <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Staff Records</span>
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white">Excel Cross-Check</div>
            <div className="text-xs text-slate-400 mt-1">
              Includes private Father's Name &amp; SHA-256
            </div>
          </div>
          <button
            onClick={handleExportExcel}
            disabled={exportLoading}
            className="w-full mt-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold py-2 rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .XLS Registry</span>
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <span>Managed Campus Events</span>
          </h2>
          <span className="text-xs text-slate-400">Total: {events.length}</span>
        </div>

        {events.length === 0 ? (
          <p className="text-slate-400 text-sm py-4">No events created yet. Click "Create Event" or type any event title when issuing a certificate.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {events.map((ev: any) => (
              <div key={ev.id} className="bg-[#0b0f19] border border-slate-700/70 p-4 rounded-2xl space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-white text-sm">{ev.title}</h4>
                  <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    {ev.category}
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{ev.event_date} &bull; {ev.venue}</span>
                </div>
                <div className="text-xs text-slate-300 flex items-center justify-between pt-2 border-t border-slate-800">
                  <span>Issued: {ev.total_certs || 0} ({ev.active_certs || 0} active)</span>
                  <button
                    onClick={() => {
                      setSelectedEventId(String(ev.id));
                      setShowCertModal(true);
                    }}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold text-xs flex items-center gap-1"
                  >
                    <span>Issue Cert</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recently Issued Certificates Roster */}
      <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-400" />
              <span>Recently Issued Certificates Roster</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Every certificate has a unique ID, scannable QR, and private Father's Name record for authorized staff.
            </p>
          </div>
          <button
            onClick={handleExportExcel}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export to Excel</span>
          </button>
        </div>

        {(!dashboard?.recent_certificates || dashboard.recent_certificates.length === 0) ? (
          <p className="text-slate-400 text-sm py-4">No certificates issued yet. Issue a certificate to view records here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#0b0f19] text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-700">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Certificate ID</th>
                  <th className="py-3 px-4">Student's Name</th>
                  <th className="py-3 px-4">Father's Name (Private)</th>
                  <th className="py-3 px-4">Target Event</th>
                  <th className="py-3 px-4">Role / Recognition</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Action &amp; QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {dashboard.recent_certificates.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-purple-400">{c.certificate_code}</td>
                    <td className="py-3 px-4 font-semibold text-white">{c.recipient_name}</td>
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      {c.father_name ? (
                        <span className="flex items-center gap-1 text-slate-300">
                          <UserCheck className="w-3 h-3 text-purple-400 inline" />
                          <span>{c.father_name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Not Recorded</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{c.event_title}</td>
                    <td className="py-3 px-4 text-slate-300">{c.participation_role}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide inline-flex items-center gap-1 ${
                          c.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          const certPayload = {
                            ...c,
                            recipient_name: c.recipient_name,
                            father_name: c.father_name,
                            participation_role: c.participation_role,
                            event_title: c.event_title,
                            certificate_code: c.certificate_code,
                            issue_date: c.issue_date,
                            canonical_hash: c.canonical_hash,
                          };
                          if (onViewCert) {
                            onViewCert(certPayload);
                          } else {
                            const event = new CustomEvent('open-cert-modal', { detail: certPayload });
                            window.dispatchEvent(event);
                          }
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-3 py-1.5 rounded-xl font-bold transition text-xs flex items-center gap-1.5"
                        title="View Official Certificate & QR"
                      >
                        <QrCode className="w-3.5 h-3.5 text-purple-400" />
                        <span>View QR</span>
                      </button>

                      {c.status === 'active' ? (
                        <button
                          onClick={() => handleRevoke(c.id)}
                          className="bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-xl font-bold transition text-xs"
                        >
                          Revoke
                        </button>
                      ) : (
                        <span className="text-[11px] text-rose-400 italic">Revoked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Recharge Credits */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-700 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Coins className="w-6 h-6 text-amber-400" />
                <h3 className="text-xl font-bold text-white">Recharge Certificate Credits</h3>
              </div>
              <button onClick={() => setShowRechargeModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRechargeCredits} className="space-y-4 text-xs sm:text-sm">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300">
                Pay-as-you-go: 1 Credit = ₹1.00 = 10 Certificates (₹0.10 per certificate).
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1">How many certificates do you want to add?</label>
                <input
                  type="number"
                  min="1"
                  value={customCredits}
                  onChange={(e) => setCustomCredits(e.target.value)}
                  placeholder="e.g. 50, 100, 500"
                  className="w-full p-3 bg-[#0b0f19] border border-slate-600 rounded-xl text-white font-mono text-sm focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>

              {customCredits && parseInt(customCredits, 10) > 0 && (
                <div className="bg-[#0b0f19] p-3 rounded-xl border border-slate-700 text-xs flex justify-between">
                  <span className="text-slate-400">Total Cost:</span>
                  <span className="font-bold text-emerald-400">₹{(parseInt(customCredits, 10) * 0.10).toFixed(2)}</span>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-200 block mb-1">Select Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs ${paymentMethod === 'upi' ? 'bg-purple-600 text-white border-purple-500' : 'bg-[#0b0f19] border-slate-700 text-slate-300'}`}
                  >
                    UPI / QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs ${paymentMethod === 'card' ? 'bg-purple-600 text-white border-purple-500' : 'bg-[#0b0f19] border-slate-700 text-slate-300'}`}
                  >
                    Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('netbanking')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs ${paymentMethod === 'netbanking' ? 'bg-purple-600 text-white border-purple-500' : 'bg-[#0b0f19] border-slate-700 text-slate-300'}`}
                  >
                    NetBanking
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowRechargeModal(false)} className="px-4 py-2 text-slate-300 hover:text-white font-bold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rechargeLoading || !customCredits}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-2.5 rounded-xl shadow-lg transition disabled:opacity-50"
                >
                  {rechargeLoading ? 'Processing...' : 'Authorize Recharge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Event */}
      {showEventModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-700 text-slate-100">
            <h3 className="text-xl font-bold text-white mb-3">Create Campus Event</h3>
            <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="font-bold text-slate-200 block mb-1">Event Title *</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Annual Sports Championship 2026"
                  className="w-full p-3 bg-[#0b0f19] border border-slate-600 rounded-xl text-white placeholder-slate-400 text-sm focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-200 block mb-1">Category</label>
                <select
                  value={eventCategory}
                  onChange={(e) => setEventCategory(e.target.value)}
                  className="w-full p-3 bg-[#0b0f19] border border-slate-600 rounded-xl text-white text-sm focus:border-purple-500 focus:outline-none"
                >
                  <option value="Sports">Sports</option>
                  <option value="Academic">Academic</option>
                  <option value="Hackathon">Hackathon</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Symposium">Symposium</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-200 block mb-1">Event Date *</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full p-3 bg-[#0b0f19] border border-slate-600 rounded-xl text-white text-sm focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-200 block mb-1">Venue *</label>
                <input
                  type="text"
                  value={eventVenue}
                  onChange={(e) => setEventVenue(e.target.value)}
                  placeholder="e.g. University Stadium"
                  className="w-full p-3 bg-[#0b0f19] border border-slate-600 rounded-xl text-white placeholder-slate-400 text-sm focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setShowEventModal(false)} className="px-4 py-2.5 text-slate-300 hover:text-white font-bold">
                  Cancel
                </button>
                <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg transition">
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Issue Certificate */}
      {showCertModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-[#111827] rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-700 text-slate-100 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-400" />
                  <span>Issue Official Certificate</span>
                </h3>
                <p className="text-xs text-emerald-400 font-medium mt-0.5">
                  Cost: ₹0.10 (1 credit) &bull; Standard Professional Design &bull; Phone Scannable QR
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCertModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIssueCert} className="space-y-4 text-xs sm:text-sm">
              {/* Event selection or custom entry */}
              <div>
                <label className="font-bold text-slate-200 block mb-1">
                  Target Event Name *
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={selectedEventId}
                      onChange={(e) => setSelectedEventId(e.target.value)}
                      className="w-1/2 p-2.5 bg-[#0b0f19] border border-slate-600 rounded-xl text-white text-xs sm:text-sm focus:border-purple-500 focus:outline-none"
                    >
                      <option value="custom">✍️ Type Custom Event...</option>
                      {events.map((ev: any) => (
                        <option key={ev.id} value={String(ev.id)}>
                          {ev.title}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={selectedEventId === 'custom' ? customEventTitle : (events.find((ev: any) => String(ev.id) === String(selectedEventId))?.title || customEventTitle)}
                      onChange={(e) => {
                        setSelectedEventId('custom');
                        setCustomEventTitle(e.target.value);
                      }}
                      placeholder="e.g. National Hackathon / Sports Meet"
                      className="w-1/2 p-2.5 bg-[#0b0f19] border border-slate-600 rounded-xl text-white placeholder-slate-400 text-xs sm:text-sm focus:border-purple-500 focus:outline-none"
                      required
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    You can select an existing event or type any event title directly.
                  </span>
                </div>
              </div>

              {/* Student Name & Father's Name (Distinguishes students with same name, no Gmail needed) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-200 block mb-1">Student's Name *</label>
                  <input
                    type="text"
                    value={recipName}
                    onChange={(e) => setRecipName(e.target.value)}
                    placeholder="e.g. Aryan Sharma"
                    className="w-full p-2.5 bg-[#0b0f19] border border-slate-600 rounded-xl text-white placeholder-slate-400 text-xs sm:text-sm focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-200 block mb-1">
                    Father's Name *
                  </label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full p-2.5 bg-[#0b0f19] border border-slate-600 rounded-xl text-white placeholder-slate-400 text-xs sm:text-sm focus:border-purple-500 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-purple-300 block mt-0.5">
                    Saved privately for staff cross-checking &amp; Excel
                  </span>
                </div>
              </div>

              {/* Role & Student Identifier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-200 block mb-1">Role / Recognition *</label>
                  <input
                    type="text"
                    value={recipRole}
                    onChange={(e) => setRecipRole(e.target.value)}
                    placeholder="e.g. 1st Place Winner / Participant"
                    className="w-full p-2.5 bg-[#0b0f19] border border-slate-600 rounded-xl text-white text-xs sm:text-sm focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-200 block mb-1">Student / Roll ID (Optional)</label>
                  <input
                    type="text"
                    value={recipId}
                    onChange={(e) => setRecipId(e.target.value)}
                    placeholder="e.g. GEHU-2026-081"
                    className="w-full p-2.5 bg-[#0b0f19] border border-slate-600 rounded-xl text-white placeholder-slate-400 text-xs sm:text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCertModal(false)}
                  className="px-4 py-2 text-slate-300 hover:text-white font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issueLoading || !recipName.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-2.5 rounded-xl shadow-lg transition disabled:opacity-50 text-xs flex items-center gap-1.5"
                >
                  <Award className="w-4 h-4" />
                  <span>{issueLoading ? 'Issuing...' : 'Issue Certificate (₹0.10)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
