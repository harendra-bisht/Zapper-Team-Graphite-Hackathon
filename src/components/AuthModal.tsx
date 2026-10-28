import React, { useState } from 'react';
import { UserCheck, Building2, Lock, Mail, Globe, Phone, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface AuthModalProps {
  onLoginSuccess: (user: any) => void;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLoginSuccess, onClose }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [repName, setRepName] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('token', data.token);
          onLoginSuccess(data.user);
          onClose();
        } else {
          setError(data.error || 'Authentication failed.');
        }
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organization_name: orgName,
            authorized_rep_name: repName,
            email,
            phone,
            password,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          if (data.token && data.user) {
            localStorage.setItem('token', data.token);
            onLoginSuccess(data.user);
            onClose();
          } else {
            setSuccess(data.message || 'Institution registered successfully!');
            setMode('login');
          }
        } else {
          setError(data.error || 'Registration failed.');
        }
      }
    } catch {
      setError('Cannot connect to authentication service on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#111827] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-700 text-slate-100 my-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">
                {mode === 'login' ? 'Sign In to Portal' : 'Apply for Institution'}
              </h2>
              <p className="text-xs text-slate-300">
                {mode === 'login' ? 'Access your institutional hub or admin console' : 'Register your campus club or department'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2 mb-4 font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2 mb-4 font-semibold">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {mode === 'register' && (
            <>
              <div>
                <label className="font-bold text-slate-200 block mb-1">Organization Name *</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Stanford AI Society"
                  className="w-full p-3 bg-[#0b0f19] border border-slate-600 rounded-xl text-white placeholder-slate-400 text-sm focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1">Lead Representative *</label>
                <input
                  type="text"
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                  placeholder="Full Name (e.g. Dr. Sarah Connor)"
                  className="w-full p-3 bg-[#0b0f19] border border-slate-600 rounded-xl text-white placeholder-slate-400 text-sm focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="font-bold text-slate-200 block mb-1">Institutional Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="acm@studentchapter.edu"
              className="w-full p-3 bg-[#0b0f19] border border-slate-600 rounded-xl text-white placeholder-slate-400 text-sm focus:border-purple-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-200 block mb-1">Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-3 bg-[#0b0f19] border border-slate-600 rounded-xl text-white placeholder-slate-400 text-sm focus:border-purple-500 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-black py-3 rounded-xl text-sm transition shadow-lg disabled:opacity-50 mt-2"
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Sign In to Portal' : 'Submit Application'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-700/80 flex flex-wrap justify-between items-center gap-2 text-xs">
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
            className="text-purple-400 font-bold hover:underline"
          >
            {mode === 'login' ? 'Apply New Institution' : 'Already registered? Sign In'}
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setEmail('admin@certishield.edu');
                setPassword('Admin@CertiShield2026');
              }}
              className="text-slate-400 hover:text-white text-[11px] underline"
            >
              Fill Admin Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
