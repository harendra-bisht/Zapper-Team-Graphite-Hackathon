import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Building2, 
  Printer, 
  Sparkles,
  ArrowRight,
  LogOut,
  UserCheck,
  Calendar,
  Layers,
  Award,
  Lock,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  Menu,
  X,
  LayoutDashboard,
  QrCode,
  Coins
} from 'lucide-react';
import { MainDashboardView } from './MainDashboardView';
import { CertificateModal } from './CertificateModal';
import { InstitutionHub } from './InstitutionHub';
import { AdminDashboardView } from './AdminDashboardView';
import { TrustPassportView } from './TrustPassportView';
import { PricingView } from './PricingView';
import { AuthModal } from './AuthModal';
import { StandaloneCertificateView } from './StandaloneCertificateView';
import { AuthPortalView } from './AuthPortalView';

export const CertiTrustView: React.FC = () => {
  // Navigation Routing State - Default is the rich platform Dashboard
  const [currentView, setCurrentView] = useState<'dashboard' | 'verify' | 'hub' | 'admin' | 'passport' | 'pricing'>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [selectedInstId, setSelectedInstId] = useState<string | number | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('institution') || params.get('inst_id') || params.get('domain') || null;
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Standalone QR Direct Scan Mode (when QR scanned via phone camera)
  const [directScanCode, setDirectScanCode] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('verify') || params.get('id');
  });

  // Verification Search State inside Portal
  const [searchCode, setSearchCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeModalCert, setActiveModalCert] = useState<any>(null);

  // Synchronize route and read URL query parameters
  const syncRouteFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('verify') || params.get('id');
    const viewParam = params.get('view') as 'dashboard' | 'verify' | 'hub' | 'admin' | 'passport' | 'pricing' | null;
    const instParam = params.get('institution') || params.get('inst_id') || params.get('domain');

    if (instParam) {
      setSelectedInstId(instParam);
    }

    if (codeParam) {
      setDirectScanCode(codeParam);
    } else {
      setDirectScanCode(null);
      if (viewParam && ['dashboard', 'verify', 'hub', 'admin', 'passport', 'pricing'].includes(viewParam)) {
        setCurrentView(viewParam);
      } else {
        setCurrentView('dashboard');
      }
    }
  };

  const handleOpenPassport = (targetIdOrDomain: string | number) => {
    setSelectedInstId(targetIdOrDomain);
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'passport');
    url.searchParams.set('institution', String(targetIdOrDomain));
    window.history.pushState({}, '', url.toString());
    setCurrentView('passport');
  };

  useEffect(() => {
    // Check if token exists to hydrate user session
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.user) setUser(d.user);
        })
        .catch(() => {});
    }

    syncRouteFromUrl();

    // Listen for browser Back/Forward navigation
    const handlePopState = () => syncRouteFromUrl();
    window.addEventListener('popstate', handlePopState);

    // Listen for custom modal events
    const handleOpenCertModal = (e: any) => {
      if (e.detail) setActiveModalCert(e.detail);
    };
    window.addEventListener('open-cert-modal', handleOpenCertModal);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('open-cert-modal', handleOpenCertModal);
    };
  }, []);

  // Update URL history when switching views
  const navigateTo = async (view: 'dashboard' | 'verify' | 'hub' | 'admin' | 'passport' | 'pricing') => {
    setMobileMenuOpen(false);
    setCurrentView(view);
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    if (view !== 'verify') {
      url.searchParams.delete('verify');
      url.searchParams.delete('id');
    }
    window.history.pushState({}, '', url.toString());
  };

  // Quick Demo Scenarios
  const handleQuickLookup = async (code: string, isTampered = false) => {
    setCurrentView('verify');
    setSearchCode(code);
    setLoading(true);
    setError(null);
    try {
      let url = `/api/public/verify/${encodeURIComponent(code)}`;
      if (isTampered) {
        url += `?file_hash=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'success') {
        setResult(data.data);
      } else {
        setError(data.error || 'Verification record not found.');
      }

      // Update URL search params
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('view', 'verify');
      currentUrl.searchParams.set('verify', code);
      window.history.pushState({}, '', currentUrl.toString());
    } catch {
      setError('Cannot connect to CertiShield API server. Please check server status.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCode.trim()) {
      handleQuickLookup(searchCode.trim());
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigateTo('dashboard');
  };

  // Standalone QR Direct Scan View:
  // When anyone scans a certificate QR code with their smartphone camera,
  // ONLY the official certificate opens with original name and verification details (no website/navbar clutter)
  if (directScanCode) {
    return (
      <StandaloneCertificateView
        code={directScanCode}
        onBack={() => {
          const u = new URL(window.location.href);
          u.searchParams.delete('verify');
          u.searchParams.delete('id');
          window.history.pushState({}, '', u.pathname || '/');
          setDirectScanCode(null);
          setCurrentView('dashboard');
        }}
      />
    );
  }

  // Security Gatekeeper: The first thing upon opening the web app is the Sign Up / Login Gateway!
  // No one can see the internal dashboard without signing up / logging in.
  if (!user && currentView !== 'verify') {
    return (
      <AuthPortalView
        onLoginSuccess={(loggedUser, targetView) => {
          setUser(loggedUser);
          navigateTo(targetView);
        }}
        onOpenPublicVerifier={() => navigateTo('verify')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#080a12] text-[#f8fafc] font-sans selection:bg-[#9b87ff]/40 flex flex-col antialiased">
      {/* Main Navigation Header - Clean Enterprise Top Bar */}
      <header className="border-b border-slate-800 bg-[#0b0f19] sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 py-3.5 flex items-center justify-between">
          {/* Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigateTo(user?.role === 'admin' ? 'admin' : 'dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-white block">
                CertiShield
              </span>
              <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
                Enterprise Credential Registry &amp; Phone QR Verifier
              </p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1.5 text-sm font-semibold">
            {user?.role === 'admin' ? (
              <>
                <button
                  onClick={() => navigateTo('admin')}
                  className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                    currentView === 'admin'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Campus Admin</span>
                </button>
                <button
                  onClick={() => navigateTo('verify')}
                  className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                    currentView === 'verify'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>Public Verifier</span>
                </button>
              </>
            ) : user?.role === 'institution' ? (
              <>
                <button
                  onClick={() => navigateTo('dashboard')}
                  className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                    currentView === 'dashboard'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => navigateTo('hub')}
                  className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                    currentView === 'hub'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>Institution Hub</span>
                </button>
                <button
                  onClick={() => navigateTo('verify')}
                  className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                    currentView === 'verify'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>Public Verifier</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => navigateTo('dashboard')}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl transition shadow flex items-center gap-1.5"
              >
                <UserCheck className="w-4 h-4" />
                <span>Sign In / Admin Console</span>
              </button>
            )}

            {user && (
              <div className="flex items-center gap-2 pl-3 border-l border-slate-700">
                <span className="text-xs text-purple-300 font-bold bg-purple-500/20 px-3 py-1.5 rounded-xl border border-purple-500/30">
                  {user.organization_name || user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-rose-400 hover:bg-rose-500/20 p-2 rounded-xl transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </nav>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            {user && (
              <span className="text-xs text-purple-300 font-bold bg-purple-500/20 px-2 py-1 rounded-lg border border-purple-500/30 max-w-[120px] truncate">
                {user.organization_name || user.name}
              </span>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0d1322] border-b border-slate-800 px-4 py-4 space-y-2 text-sm font-bold">
            {user?.role === 'admin' ? (
              <>
                <button
                  onClick={() => navigateTo('admin')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-center gap-2 ${
                    currentView === 'admin' ? 'bg-amber-600 text-white' : 'text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>🛡️ Campus Admin</span>
                </button>
                <button
                  onClick={() => navigateTo('verify')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-center gap-2 ${
                    currentView === 'verify' ? 'bg-purple-600 text-white' : 'text-slate-200'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>🔍 Public Verifier</span>
                </button>
              </>
            ) : user?.role === 'institution' ? (
              <>
                <button
                  onClick={() => navigateTo('dashboard')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-center gap-2 ${
                    currentView === 'dashboard' ? 'bg-purple-600 text-white' : 'text-slate-200'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>📊 Platform Dashboard</span>
                </button>
                <button
                  onClick={() => navigateTo('hub')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-center gap-2 ${
                    currentView === 'hub' ? 'bg-emerald-600 text-white' : 'text-slate-200'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>🏛️ Institution Hub</span>
                </button>
                <button
                  onClick={() => navigateTo('verify')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-center gap-2 ${
                    currentView === 'verify' ? 'bg-purple-600 text-white' : 'text-slate-200'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>🔍 Public Verifier</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => navigateTo('dashboard')}
                className="w-full bg-purple-600 text-white px-4 py-3 rounded-xl text-center"
              >
                Sign In / Admin Console
              </button>
            )}

            {user && (
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full text-left text-rose-400 font-bold px-3 py-2 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out ({user.organization_name || user.name})</span>
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area Based on Active View */}
      <div className="flex-1">
        {/* 1. Main Platform Dashboard */}
        {currentView === 'dashboard' && (
          <MainDashboardView
            onNavigate={(v) => navigateTo(v)}
            onVerifyCode={(code) => handleQuickLookup(code)}
            onViewCert={(cert) => setActiveModalCert(cert)}
            onOpenPassport={handleOpenPassport}
            user={user}
          />
        )}

        {/* 2. Pricing & Business Model View */}
        {currentView === 'pricing' && (
          <PricingView onNavigateToHub={() => navigateTo('hub')} />
        )}

        {/* 3. Trust Passport View */}
        {currentView === 'passport' && (
          <TrustPassportView 
            targetIdOrDomain={selectedInstId} 
            onBack={() => navigateTo(user?.role === 'admin' ? 'admin' : 'dashboard')} 
          />
        )}

        {/* 4. Institution Hub View */}
        {currentView === 'hub' && (
          user && user.role === 'institution' ? (
            <InstitutionHub user={user} onViewCert={(cert) => setActiveModalCert(cert)} />
          ) : (
            <div className="max-w-xl mx-auto my-14 px-4">
              <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shadow-lg">
                  <Building2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-white">Institution Hub Access</h2>
                  <p className="text-slate-300 text-sm max-w-md mx-auto">
                    Authorized faculty and student chapter organizers can issue cryptographic certificates (₹0.10 / cert), manage campus events, and revoke credentials.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => navigateTo('dashboard')}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-2xl text-sm transition shadow-lg"
                  >
                    Go to Institution Login
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {/* 5. Campus Admin Console View */}
        {currentView === 'admin' && (
          user && user.role === 'admin' ? (
            <AdminDashboardView onOpenPassport={handleOpenPassport} />
          ) : (
            <div className="max-w-xl mx-auto my-14 px-4">
              <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shadow-lg">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-white">Campus Admin Console</h2>
                  <p className="text-slate-300 text-sm max-w-md mx-auto">
                    Vetting authority console for approving collegiate chapters, inspecting security audit trails, and monitoring tamper events across campus.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => navigateTo('dashboard')}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 px-6 rounded-2xl text-sm transition shadow-lg"
                  >
                    Go to Admin Login
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {/* 6. Public Verifier View */}
        {currentView === 'verify' && (
          <div>
            {/* Hero Search Section */}
            <section className="relative overflow-hidden pt-10 pb-8 px-4 sm:px-6">
              <div className="max-w-3xl mx-auto text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Public Registry Verifier &bull; Sub-Second Cryptographic Check</span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                  Verify Certificate Authenticity
                </h1>

                <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto font-medium">
                  Scan any certificate QR code using a smartphone camera or manually enter the unique Certificate ID below.
                </p>

                {/* Search Bar */}
                <form onSubmit={handleManualSearch} className="pt-2 max-w-2xl mx-auto">
                  <div className="bg-[#111827] border-2 border-slate-700 focus-within:border-purple-500 rounded-2xl p-2 flex items-center gap-2 shadow-xl transition">
                    <Search className="w-5 h-5 text-slate-400 ml-3 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Enter Certificate ID (e.g. CS-2026-8K2P-9M4A)"
                      value={searchCode}
                      onChange={(e) => setSearchCode(e.target.value)}
                      className="w-full bg-transparent text-white placeholder-slate-400 text-sm sm:text-base px-2 py-2 focus:outline-none font-mono"
                      required
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition disabled:opacity-50 flex-shrink-0 shadow"
                    >
                      <span>{loading ? 'Verifying...' : 'Verify ID'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>

                {/* Verification Instruction Note */}
                <div className="pt-2 text-xs text-slate-400">
                  <span>Enter any issued Certificate Code (e.g. issued from Institution Hub) to view official cryptographic authenticity proof.</span>
                </div>
              </div>
            </section>

            {/* Results Section */}
            <main className="max-w-3xl mx-auto px-4 pb-16">
              {error && (
                <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 p-4 rounded-2xl text-sm mb-6 flex items-center gap-3 shadow-lg font-semibold">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {result && (
                <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-slate-100">
                  {/* Status Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-700">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                          result.verdict === 'verified'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : result.verdict === 'revoked'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : result.verdict === 'tampered'
                            ? 'bg-pink-500/20 text-pink-300 border border-pink-400/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {result.verdict === 'verified' && <CheckCircle2 className="w-8 h-8" />}
                        {result.verdict === 'revoked' && <XCircle className="w-8 h-8" />}
                        {result.verdict === 'tampered' && <AlertTriangle className="w-8 h-8" />}
                        {result.verdict !== 'verified' &&
                          result.verdict !== 'revoked' &&
                          result.verdict !== 'tampered' && <AlertTriangle className="w-8 h-8" />}
                      </div>

                      <div>
                        <span
                          className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                            result.verdict === 'verified'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : result.verdict === 'revoked'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : result.verdict === 'tampered'
                              ? 'bg-pink-500/20 text-pink-300 border border-pink-400/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {result.verdict_title}
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                          {result.verdict === 'verified' && 'Official Genuine Certificate'}
                          {result.verdict === 'revoked' && 'Certificate Has Been Revoked'}
                          {result.verdict === 'tampered' && 'Integrity Check Failed (Altered)'}
                          {result.verdict === 'not_found' && 'No Matching Record Found'}
                        </h2>
                      </div>
                    </div>

                    {result.verdict === 'verified' && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setDirectScanCode(result.certificate?.code)}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow"
                        >
                          <Award className="w-4 h-4" />
                          <span>Open Standalone Cert</span>
                        </button>
                        <button
                          onClick={() =>
                            setActiveModalCert({
                              certificate_code: result.certificate?.code,
                              recipient_name: result.certificate?.recipient_name_raw,
                              participation_role: result.certificate?.role,
                              event_title: result.event?.title,
                              institution_name: result.institution?.name,
                              issue_date: result.certificate?.issue_date,
                              canonical_hash: result.certificate?.canonical_hash,
                              template_id: result.certificate?.template_id || 'plain_professional',
                            })
                          }
                          className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                        >
                          <Printer className="w-4 h-4 text-purple-400" />
                          <span>Printable Cert + QR</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Recipient & Event Details */}
                  {result.certificate && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="bg-[#1e293b]/70 p-4 rounded-2xl border border-slate-700">
                        <span className="text-xs text-slate-400 font-bold uppercase block mb-1">
                          Certificate Recipient
                        </span>
                        <div className="text-lg font-bold text-white">
                          {result.certificate.recipient_name_raw}
                        </div>
                        <div className="text-xs text-purple-300 font-mono mt-0.5">
                          ID: {result.certificate.code}
                        </div>
                      </div>

                      <div className="bg-[#1e293b]/70 p-4 rounded-2xl border border-slate-700">
                        <span className="text-xs text-slate-400 font-bold uppercase block mb-1">
                          Event &amp; Achievement
                        </span>
                        <div className="text-lg font-bold text-white">{result.event?.title}</div>
                        <div className="text-xs text-emerald-400 font-bold mt-0.5">
                          {result.certificate.role}
                        </div>
                      </div>

                      <div className="bg-[#1e293b]/70 p-4 rounded-2xl border border-slate-700">
                        <span className="text-xs text-slate-400 font-bold uppercase block mb-1">
                          Issuing Organization
                        </span>
                        <div className="flex items-center gap-2 font-bold text-white">
                          <Building2 className="w-4 h-4 text-purple-400" />
                          <span>{result.institution?.name}</span>
                        </div>
                        <div className="text-xs text-emerald-400 font-semibold mt-0.5">✓ Vetted Authorized Issuer</div>
                      </div>

                      <div className="bg-[#1e293b]/70 p-4 rounded-2xl border border-slate-700">
                        <span className="text-xs text-slate-400 font-bold uppercase block mb-1">
                          Issue Date
                        </span>
                        <div className="font-bold text-white">{result.certificate.issue_date}</div>
                        <div className="text-xs text-slate-300 mt-0.5">Master Registry Verified</div>
                      </div>
                    </div>
                  )}

                  {/* Evidence Checklist */}
                  <div className="bg-[#1e293b]/50 rounded-2xl p-4 border border-slate-700/80">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                      Server-Side Evidence Log:
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-200">
                      {result.evidence.map((ev: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-purple-400 font-bold">&bull;</span>
                          <span className="font-medium">{ev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </main>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onLoginSuccess={(loggedInUser) => {
            setUser(loggedInUser);
            setShowAuthModal(false);
            navigateTo(loggedInUser.role === 'admin' ? 'admin' : 'hub');
          }}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* Certificate QR Modal */}
      {activeModalCert && (
        <CertificateModal cert={activeModalCert} onClose={() => setActiveModalCert(null)} />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0b0f19] py-6 text-xs text-slate-400 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="font-bold text-slate-200">
            CertiShield &bull; Enterprise Credential Infrastructure
          </div>
          <div className="font-medium">
            Transparent ₹0.10 Micro-Utility Model &bull; Sub-Second Mobile QR Verification &bull; Zero Sensitive Data Harvesting
          </div>
        </div>
      </footer>
    </div>
  );
};
