import React from 'react';
import { ShieldCheck, Award, QrCode, Building2, UserCheck, LogOut, CheckCircle2 } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: any;
  onLogout: () => void;
  onDemoSelect: (id: string, tamper?: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  user,
  onLogout,
  onDemoSelect
}) => {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      {/* Judge Benchmark Quick-Bar */}
      <div className="bg-slate-900 text-slate-100 text-xs px-4 py-1.5 border-b border-blue-500 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
            GRAPHITE 26 &bull; PS 13
          </span>
          <span className="text-slate-300 font-medium">Evaluation Quick Jump:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onDemoSelect('GPH-26-8F29A')}
            className="bg-slate-800 hover:bg-blue-600 text-blue-200 hover:text-white px-2 py-1 rounded transition text-[11px] font-semibold"
          >
            1. Genuine Check
          </button>
          <button
            onClick={() => onDemoSelect('GPH-26-REVOK')}
            className="bg-slate-800 hover:bg-rose-600 text-rose-200 hover:text-white px-2 py-1 rounded transition text-[11px] font-semibold"
          >
            2. Revoked Check
          </button>
          <button
            onClick={() => onDemoSelect('GPH-25-EXPIR')}
            className="bg-slate-800 hover:bg-amber-600 text-amber-200 hover:text-white px-2 py-1 rounded transition text-[11px] font-semibold"
          >
            3. Expired Check
          </button>
          <button
            onClick={() => onDemoSelect('GPH-26-FAKE99')}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-1 rounded transition text-[11px] font-semibold"
          >
            4. Not Found Check
          </button>
          <button
            onClick={() => onDemoSelect('GPH-26-8F29A', true)}
            className="bg-slate-800 hover:bg-pink-600 text-pink-200 hover:text-white px-2 py-1 rounded transition text-[11px] font-semibold"
          >
            5. Tamper Diagnostic
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('home')}>
            <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-md shadow-blue-200 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-xl text-slate-900 tracking-tight flex items-center gap-2">
                CertiShield
                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                  PS 13
                </span>
              </span>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Institutional Certificate Authenticity &amp; Tamper Verification Engine
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => setCurrentTab('verify')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition ${
                currentTab === 'verify'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <QrCode className="w-4 h-4" />
              Public Verifier
            </button>

            <button
              onClick={() => setCurrentTab('passport')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition ${
                currentTab === 'passport'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Trust Passport
            </button>

            {user ? (
              <>
                <button
                  onClick={() => setCurrentTab(user.role === 'admin' ? 'admin' : 'dashboard')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition ${
                    currentTab === 'dashboard' || currentTab === 'admin'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  {user.role === 'admin' ? 'Admin Vetting Panel' : 'Institution Hub'}
                </button>
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <span className="text-xs text-slate-500 font-medium hidden md:inline">
                    {user.name} ({user.organization_name || user.role})
                  </span>
                  <button
                    onClick={onLogout}
                    className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => setCurrentTab('auth')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5"
              >
                <UserCheck className="w-4 h-4" />
                Sign In / Apply
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
