import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Building2, 
  UserCheck, 
  Lock, 
  Mail, 
  Phone, 
  AlertCircle, 
  CheckCircle2, 
  Search,
  Sparkles,
  ArrowRight,
  Briefcase
} from 'lucide-react';

interface AuthPortalViewProps {
  onLoginSuccess: (user: any, targetView: 'admin' | 'dashboard' | 'hub') => void;
  onOpenPublicVerifier: () => void;
}

export const AuthPortalView: React.FC<AuthPortalViewProps> = ({ 
  onLoginSuccess, 
  onOpenPublicVerifier 
}) => {
  const [activeTab, setActiveTab] = useState<'admin_login' | 'inst_login' | 'inst_register'>('admin_login');

  const [adminEmail, setAdminEmail] = useState('admin@certishield.edu');
  const [adminPassword, setAdminPassword] = useState('Admin@CertiShield2026');

  // Institution credentials (shared between login and register)
  const [instEmail, setInstEmail] = useState('');
  const [instPassword, setInstPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [repName, setRepName] = useState('');
  const [position, setPosition] = useState('Club President / Lead');
  const [customPosition, setCustomPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleTabSwitch = (tab: 'admin_login' | 'inst_login' | 'inst_register') => {
    setActiveTab(tab);
    setError(null);
    setSuccess(null);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!adminEmail.trim()) {
      setError('Please enter the Campus Admin email.');
      return;
    }
    if (!adminPassword) {
      setError('Please enter the Admin password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail.trim(), password: adminPassword })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        const user = data.user || data.institution;
        onLoginSuccess(user, 'admin');
      } else {
        setError(data.error || 'Authentication failed. Please verify credentials.');
      }
    } catch {
      setError('Cannot reach authentication server on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const handleInstLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = instEmail.trim();
    if (!cleanEmail) {
      setError('Please enter your registered institutional email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email format (e.g. club@campus.edu).');
      return;
    }
    if (!instPassword) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: instPassword })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        const user = data.user || data.institution;
        onLoginSuccess(user, user.role === 'admin' ? 'admin' : 'dashboard');
      } else {
        setError(data.error || 'Authentication failed. Please check your credentials.');
      }
    } catch {
      setError('Cannot reach authentication server on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const finalPosition = position === 'Other' ? customPosition.trim() : position;
    if (!orgName.trim()) {
      setError('Please enter your Organization / Club Name.');
      return;
    }
    if (!repName.trim()) {
      setError('Please enter the Representative Full Name.');
      return;
    }
    if (!finalPosition) {
      setError('Please select or specify your position in the institution.');
      return;
    }
    const cleanEmail = instEmail.trim();
    if (!cleanEmail) {
      setError('Please enter an institutional email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email format (e.g. chapter@campus.edu).');
      return;
    }
    if (!instPassword || instPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_name: orgName.trim(),
          authorized_rep_name: repName.trim(),
          position: finalPosition,
          email: cleanEmail,
          phone: phone.trim() || null,
          password: instPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.token && data.user) {
          localStorage.setItem('token', data.token);
          onLoginSuccess(data.user, 'dashboard');
        } else {
          setSuccess('Account created successfully! You can now log in with your credentials.');
          setActiveTab('inst_login');
        }
      } else {
        setError(data.error || 'Registration failed.');
      }
    } catch {
      setError('Cannot reach authentication server on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080a12] text-slate-100 flex flex-col justify-between p-4 sm:p-6 antialiased">
      {/* Top Header */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-xl text-white tracking-tight">CertiShield</h1>
            <p className="text-xs text-slate-400">Institutional Credential Registry & Verifier</p>
          </div>
        </div>

        <button
          onClick={onOpenPublicVerifier}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 shadow-sm"
        >
          <Search className="w-4 h-4 text-purple-400" />
          <span>Public Verifier</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="max-w-xl w-full mx-auto my-8">
        <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Header Title */}
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black text-white">
              {activeTab === 'admin_login' && 'Campus Admin Console'}
              {activeTab === 'inst_login' && 'Institution Sign In'}
              {activeTab === 'inst_register' && 'Register New Institution / Club'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              {activeTab === 'admin_login' && 'Administrative oversight, chapter approvals, and registry governance.'}
              {activeTab === 'inst_login' && 'Access certificate issuance, campus events, and credit balance.'}
              {activeTab === 'inst_register' && 'Register your campus club or department. Includes 5 free credits (50 certs).'}
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0b0f19] border border-slate-800 rounded-2xl text-xs font-bold text-center">
            <button
              onClick={() => handleTabSwitch('admin_login')}
              className={`py-2.5 px-2 rounded-xl transition ${
                activeTab === 'admin_login'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Campus Admin
            </button>
            <button
              onClick={() => handleTabSwitch('inst_login')}
              className={`py-2.5 px-2 rounded-xl transition ${
                activeTab === 'inst_login'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Institution Login
            </button>
            <button
              onClick={() => handleTabSwitch('inst_register')}
              className={`py-2.5 px-2 rounded-xl transition ${
                activeTab === 'inst_register'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 p-3.5 rounded-xl text-xs flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-3.5 rounded-xl text-xs flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Tab 1: Campus Admin Login */}
          {activeTab === 'admin_login' && (
            <form onSubmit={handleAdminLogin} className="space-y-4 text-xs sm:text-sm">
              <div className="bg-purple-500/10 border border-purple-500/25 p-3 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-purple-300 font-bold block">Admin Access</span>
                  <span className="text-slate-400 text-[11px]">Pre-configured governance account</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAdminEmail('admin@certishield.edu');
                    setAdminPassword('Admin@CertiShield2026');
                  }}
                  className="bg-purple-600/40 hover:bg-purple-600 text-purple-200 hover:text-white px-2.5 py-1 rounded-lg font-bold text-[11px] transition"
                >
                  Fill Admin Credentials
                </button>
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1">Admin Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@certishield.edu"
                    className="w-full pl-9 pr-3 py-3 bg-[#0b0f19] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-3 bg-[#0b0f19] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In as Campus Admin'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Tab 2: Institution Sign In */}
          {activeTab === 'inst_login' && (
            <form onSubmit={handleInstLogin} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="font-bold text-slate-200 block mb-1">Institution / Club Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    value={instEmail}
                    onChange={(e) => setInstEmail(e.target.value)}
                    placeholder="yourclub@campus.edu"
                    className="w-full pl-9 pr-3 py-3 bg-[#0b0f19] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    value={instPassword}
                    onChange={(e) => setInstPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-3 bg-[#0b0f19] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In to Institution Hub'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => handleTabSwitch('inst_register')}
                  className="text-emerald-400 hover:underline text-xs font-semibold"
                >
                  New campus club or department? Register here
                </button>
              </div>
            </form>
          )}

          {/* Tab 3: Register New Institution / Club */}
          {activeTab === 'inst_register' && (
            <form onSubmit={handleRegister} className="space-y-4 text-xs sm:text-sm">
              <div className="bg-emerald-500/10 border border-emerald-500/25 p-3 rounded-xl text-xs text-emerald-300 font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span>Includes 5 Free Issuance Credits (= 50 Certificates) upon registration.</span>
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1">Organization / Club Name *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. ACM Student Chapter / Google Developer Club"
                    className="w-full pl-9 pr-3 py-3 bg-[#0b0f19] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-200 block mb-1">Representative Name *</label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      value={repName}
                      onChange={(e) => setRepName(e.target.value)}
                      placeholder="e.g. Aryan Sharma"
                      className="w-full pl-9 pr-3 py-3 bg-[#0b0f19] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-200 block mb-1">Position / Role *</label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <select
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full pl-9 pr-3 py-3 bg-[#0b0f19] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-xs sm:text-sm"
                      required
                    >
                      <option value="Club President / Lead">Club President / Lead</option>
                      <option value="Faculty Advisor">Faculty Advisor</option>
                      <option value="Event Coordinator">Event Coordinator</option>
                      <option value="Department Secretary">Department Secretary</option>
                      <option value="Dean / Department Head">Dean / Department Head</option>
                      <option value="Other">Other (Custom Position)</option>
                    </select>
                  </div>
                </div>
              </div>

              {position === 'Other' && (
                <div>
                  <label className="font-bold text-slate-200 block mb-1">Specify Your Position *</label>
                  <input
                    type="text"
                    value={customPosition}
                    onChange={(e) => setCustomPosition(e.target.value)}
                    placeholder="e.g. Technical Lead / Vice President"
                    className="w-full p-3 bg-[#0b0f19] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-200 block mb-1">Institutional Email *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="email"
                      value={instEmail}
                      onChange={(e) => setInstEmail(e.target.value)}
                      placeholder="chapter@campus.edu"
                      className="w-full pl-9 pr-3 py-3 bg-[#0b0f19] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-200 block mb-1">Contact Phone</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full pl-9 pr-3 py-3 bg-[#0b0f19] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    value={instPassword}
                    onChange={(e) => setInstPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-3 py-3 bg-[#0b0f19] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Register & Launch Institution Hub'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => handleTabSwitch('inst_login')}
                  className="text-purple-400 hover:underline text-xs font-semibold"
                >
                  Already have an institutional account? Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 py-4">
        CertiShield Enterprise Credential Registry &copy; 2026. High-Assurance Tamper-Proof Verification.
      </div>
    </div>
  );
};
