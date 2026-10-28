import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  GraduationCap, 
  ShieldCheck, 
  BookOpen, 
  UserCheck, 
  AlertTriangle, 
  Clock, 
  Lock, 
  User as UserIcon,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, fastLoginAs, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    }
  };

  const handleDemoSelect = async (demoUser: string, demoPass?: string) => {
    setError(null);
    try {
      await fastLoginAs(demoUser, demoPass);
    } catch (err: any) {
      setError(err.message || 'Fast login failed.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex p-3 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-200 mb-4">
          <GraduationCap className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          SPAMS Portal
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Student Performance Analytics & Early Intervention Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        {/* Main Card */}
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/60 sm:rounded-2xl sm:px-10 border border-slate-200">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Username or University Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or faculty.sharma or cs22001"
                  className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-md shadow-indigo-200 disabled:opacity-50"
            >
              {isLoading ? 'Signing In...' : 'Sign In with Credentials'}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </button>
          </form>

          {/* 1-Click Demo Profiles */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Instant Demo Personas
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Click to log in</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Admin */}
              <button
                type="button"
                onClick={() => handleDemoSelect('admin')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Academic Dean (Admin)</div>
                    <div className="text-xs text-slate-500">Dr. S. K. Verma • Full college setup & reports</div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Launch →
                </span>
              </button>

              {/* Faculty */}
              <button
                type="button"
                onClick={() => handleDemoSelect('faculty.sharma')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Dr. Rajesh Sharma (Faculty)</div>
                    <div className="text-xs text-slate-500">DBMS & Lab Faculty • Grade entry & interventions</div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Launch →
                </span>
              </button>

              {/* Achiever Student */}
              <button
                type="button"
                onClick={() => handleDemoSelect('cs22001')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Aditi Rao (Student - High Achiever)</div>
                    <div className="text-xs text-slate-500">CGPA 9.57 • 93% Attendance • Top ranker</div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Launch →
                </span>
              </button>

              {/* At-Risk Student */}
              <button
                type="button"
                onClick={() => handleDemoSelect('cs22005')}
                className="w-full text-left p-3 rounded-xl border border-rose-200 bg-rose-50/30 hover:border-rose-400 hover:bg-rose-50 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-rose-100 text-rose-700 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-rose-900">Aarav Mehta (Student - At-Risk)</div>
                    <div className="text-xs text-rose-600">Attendance 56% • Backlog risk • 2 Active Interventions</div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-rose-700 opacity-0 group-hover:opacity-100 transition-opacity">
                  Launch →
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Database & Security Notice */}
        <div className="mt-6 text-center text-xs text-slate-500">
          <p>
            Connected to Relational DBMS with 3NF Schema &bull; Server-Side JWT Authorization &bull; Triggers &amp; Views Enabled
          </p>
        </div>
      </div>
    </div>
  );
};
