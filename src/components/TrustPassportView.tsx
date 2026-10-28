import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ExternalLink, 
  Search, 
  ArrowLeft,
  Calendar,
  Award,
  User,
  Globe
} from 'lucide-react';

interface TrustPassportViewProps {
  targetIdOrDomain?: string | number | null;
  onBack?: () => void;
}

export const TrustPassportView: React.FC<TrustPassportViewProps> = ({ 
  targetIdOrDomain, 
  onBack 
}) => {
  const [searchInput, setSearchInput] = useState<string>(() => {
    return targetIdOrDomain ? String(targetIdOrDomain) : '';
  });
  const [passport, setPassport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPassport = async (query: string) => {
    const clean = query.trim();
    if (!clean) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/passport/${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (res.ok && data.passport) {
        setPassport(data.passport);
      } else {
        setPassport(null);
        setError(data.error || `No institutional trust passport found for identifier: "${clean}".`);
      }
    } catch {
      setError('Cannot connect to CertiShield registry API on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (targetIdOrDomain) {
      const q = String(targetIdOrDomain);
      setSearchInput(q);
      fetchPassport(q);
    } else {
      // Default initial query if nothing provided
      fetchPassport('1');
    }
  }, [targetIdOrDomain]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchPassport(searchInput.trim());
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 text-slate-100 antialiased">
      {/* Top Header / Back Bar */}
      <div className="flex items-center justify-between gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 bg-[#111827] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        )}

        <div className="text-xs text-slate-400 font-mono">
          Registry Trust Verification Engine
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[#111827] rounded-3xl border border-slate-700/80 p-6 sm:p-8 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/20 text-purple-300 rounded-2xl">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Institution Trust Passport</h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Verified public transparency profiles: inspect accreditation, domain authenticity, and total credentials.
            </p>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2 max-w-lg pt-1">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by Institution ID or Domain (e.g. 1, 2, campus.edu)"
              className="w-full p-3 bg-[#0b0f19] border border-slate-600 rounded-xl text-white placeholder-slate-400 text-xs sm:text-sm font-mono focus:border-purple-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white font-black px-6 py-3 rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            <span>{loading ? 'Searching...' : 'Lookup'}</span>
          </button>
        </form>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 p-4 rounded-2xl text-xs sm:text-sm flex items-center gap-3 font-semibold shadow-lg">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-[#111827] rounded-3xl border border-slate-700/80 p-8 text-center text-slate-400 text-sm">
          Loading institutional trust passport data...
        </div>
      )}

      {/* Passport Details */}
      {!loading && passport && (
        <div className="bg-[#111827] rounded-3xl border border-slate-700/80 p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Header Title & Status Badge */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-700">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Institutional ID: #{passport.id}
                </span>
                {passport.uuid && (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {passport.uuid.substring(0, 8)}...
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">{passport.organization_name}</h2>

              {passport.authorized_rep_name && (
                <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1 font-medium">
                  <User className="w-3.5 h-3.5 text-purple-400" />
                  <span>Authorized Representative: <strong className="text-white">{passport.authorized_rep_name}</strong></span>
                </div>
              )}

              {passport.official_website && (
                <a
                  href={passport.official_website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-sky-400 hover:underline inline-flex items-center gap-1 mt-1 font-semibold"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{passport.official_website}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="flex-shrink-0">
              <span
                className={`px-3.5 py-2 rounded-2xl font-bold text-xs shadow-md inline-flex items-center gap-2 ${
                  passport.trust_status === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : passport.trust_status === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {passport.trust_status === 'approved' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {passport.trust_status === 'pending' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                {passport.trust_status !== 'approved' && passport.trust_status !== 'pending' && <XCircle className="w-4 h-4 text-rose-400" />}
                <span className="capitalize">{passport.trust_status} Institution</span>
              </span>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-[#1e293b]/70 rounded-2xl border border-slate-700">
              <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Authenticated Domain</span>
              <span className="font-mono font-bold text-purple-300 text-base mt-1 block truncate">
                {passport.domain || 'campus.edu'}
              </span>
            </div>

            <div className="p-4 bg-[#1e293b]/70 rounded-2xl border border-slate-700">
              <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Authorized Events</span>
              <span className="font-bold text-sky-300 text-xl mt-1 block">
                {passport.metrics?.authorized_events ?? 0}
              </span>
            </div>

            <div className="p-4 bg-[#1e293b]/70 rounded-2xl border border-slate-700">
              <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Active Credentials</span>
              <span className="font-bold text-emerald-400 text-xl mt-1 block">
                {passport.metrics?.active_credentials_issued ?? 0}
              </span>
            </div>
          </div>

          {/* Institutional Statement */}
          <div className="p-5 bg-gradient-to-r from-purple-950/40 to-slate-900 border border-purple-800/40 rounded-2xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300 block">
              Official Institutional Registry Statement
            </span>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
              &ldquo;{passport.trust_statement}&rdquo;
            </p>
          </div>

          {/* Member Details */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
            <div>Member Since: {passport.member_since ? new Date(passport.member_since).toLocaleDateString() : 'Active'}</div>
            {passport.vetted_at && <div>Vetted: {new Date(passport.vetted_at).toLocaleDateString()}</div>}
          </div>
        </div>
      )}
    </div>
  );
};
