import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Coins, 
  Sparkles, 
  ShieldCheck, 
  TrendingDown, 
  Zap, 
  Building2, 
  ArrowRight,
  Calculator,
  Download,
  Check
} from 'lucide-react';

interface PricingViewProps {
  onNavigateToHub: () => void;
}

export const PricingView: React.FC<PricingViewProps> = ({ onNavigateToHub }) => {
  const [certVolume, setCertVolume] = useState<number>(2500);

  const certishieldCost = certVolume * 0.10;
  const paperCost = certVolume * 50; // ₹50/cert for security paper + printing + courier
  const blockchainCost = certVolume * 120; // ₹120/cert for gas and network fees
  const savings = paperCost - certishieldCost;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12 text-slate-100">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
          <Coins className="w-4 h-4 text-emerald-400" />
          <span>Transparent Micro-Utility Economics</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
          ₹0.10 per Certificate.{' '}
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            No Hidden Fees.
          </span>
        </h1>

        <p className="text-slate-300 text-base leading-relaxed">
          High-volume credential verification priced at true infrastructure cost. Issue 1,000 cryptographic, phone-scannable credentials for just ₹100.
        </p>
      </div>

      {/* Flexible Credit Model Overview */}
      <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-700">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">
              No Locked Packages &bull; Enter Any Quantity
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Pay Only For What You Issue
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">
              Institutions can enter any number of certificates on demand. No forced tiers or prepaid waste.
            </p>
          </div>

          <button
            onClick={onNavigateToHub}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3 rounded-2xl text-xs sm:text-sm transition shadow-lg flex items-center gap-2 flex-shrink-0"
          >
            <span>Top-up in Institution Hub</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Value Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="bg-[#161f36] border border-slate-700/80 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Unit Price</span>
              <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full">
                Fixed Rate
              </span>
            </div>
            <div className="text-3xl font-black text-white font-mono">₹0.10</div>
            <div className="text-xs text-slate-300 font-semibold">10 Paise Per Certificate</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every certificate issued is charged exactly ₹0.10, deducting 0.1 credit (or 1 credit per 10 certificates).
            </p>
          </div>

          <div className="bg-[#161f36] border border-slate-700/80 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Credit Formula</span>
              <span className="text-xs font-bold bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full">
                Micro-Billing
              </span>
            </div>
            <div className="text-3xl font-black text-white font-mono">1 Credit = ₹1.00</div>
            <div className="text-xs text-purple-300 font-semibold">Creates 10 Certificates</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              1 rupee buys 1 credit, which produces 10 high-assurance, phone-verifiable certificates.
            </p>
          </div>

          <div className="bg-[#161f36] border border-emerald-500/40 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Free Onboarding</span>
              <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full">
                Zero Setup Fee
              </span>
            </div>
            <div className="text-3xl font-black text-emerald-400 font-mono">5 Free Credits</div>
            <div className="text-xs text-emerald-300 font-semibold">= 50 Free Certificates</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every newly approved college, club, or chapter receives 5 free credits immediately upon registration.
            </p>
          </div>
        </div>

        {/* Feature inclusions checklist */}
        <div className="pt-4 border-t border-slate-700/80">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
            Included with every certificate issued at ₹0.10:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Smartphone camera QR scan</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Canonical SHA-256 tamper seal</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Instant revocation &amp; reason logs</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Official printable certificate view</span>
            </div>
          </div>
        </div>
      </div>

      {/* Unit Economics Breakdown Card */}
      <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
        <div className="border-b border-slate-700 pb-4">
          <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Calculator className="w-6 h-6 text-emerald-400" />
            <span>Unit Economics Breakdown: Where Does Your ₹0.10 Go?</span>
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            Zero bloat, zero gas-fee gouging. Every paisa is engineered for high-availability cloud infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-[#1e293b]/70 border border-slate-700 p-5 rounded-2xl space-y-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">₹0.02</span>
            <h4 className="text-sm font-bold text-white">Cryptographic Anchoring</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Canonical SHA-256 hash generation, indexing, and tamper-proof storage in replicated registry databases.
            </p>
          </div>

          <div className="bg-[#1e293b]/70 border border-slate-700 p-5 rounded-2xl space-y-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">₹0.02</span>
            <h4 className="text-sm font-bold text-white">Edge CDN &amp; QR Delivery</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Sub-second global phone camera resolution over local 5G, 4G, and Wi-Fi networks with high concurrency.
            </p>
          </div>

          <div className="bg-[#1e293b]/70 border border-slate-700 p-5 rounded-2xl space-y-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">₹0.01</span>
            <h4 className="text-sm font-bold text-white">Security &amp; Replay Audit</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Continuous scan anomaly telemetry, duplicate scan detection, and immutable administrative audit logs.
            </p>
          </div>

          <div className="bg-[#1e293b]/70 border border-slate-700 p-5 rounded-2xl space-y-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">₹0.05</span>
            <h4 className="text-sm font-bold text-white">Platform Margin</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Sustainable 50% gross margin supporting ongoing platform updates, developer APIs, and 99.99% uptime.
            </p>
          </div>
        </div>
      </div>

      {/* Institutional ROI Calculator */}
      <div className="bg-gradient-to-r from-[#111827] via-[#0f172a] to-[#1e1b4b] border border-slate-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-emerald-400" />
            <span>Interactive Campus ROI Calculator</span>
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            Compare annual operational costs between traditional physical certificates, blockchain, and CertiShield.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center text-sm font-bold">
            <span className="text-slate-200">Certificates Issued Annually:</span>
            <span className="text-emerald-400 font-mono text-xl">{certVolume.toLocaleString()} Credentials</span>
          </div>
          <input
            type="range"
            min="500"
            max="25000"
            step="500"
            value={certVolume}
            onChange={(e) => setCertVolume(parseInt(e.target.value, 10))}
            className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-700 rounded-lg"
          />
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>500 (Small College Event)</span>
            <span>10,000 (State University)</span>
            <span>25,000+ (Multi-Campus System)</span>
          </div>
        </div>

        {/* Cost Comparison Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="bg-[#0b0f19] border border-slate-700 p-5 rounded-2xl text-center">
            <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Traditional Security Paper</span>
            <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">
              ₹{paperCost.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">@ ₹50/cert + courier + storage</span>
          </div>

          <div className="bg-[#0b0f19] border border-slate-700 p-5 rounded-2xl text-center">
            <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Blockchain / Gas Fees</span>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
              ₹{blockchainCost.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">@ ₹120/cert gas &amp; wallet setup</span>
          </div>

          <div className="bg-[#0b0f19] border-2 border-emerald-500/80 p-5 rounded-2xl text-center relative shadow-lg">
            <div className="text-xs uppercase font-bold text-emerald-400 block mb-1">CertiShield Model</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono">
              ₹{certishieldCost.toLocaleString()}
            </div>
            <span className="text-[11px] text-emerald-400 font-bold block mt-1">
              ₹0.10/cert &bull; Save ₹{savings.toLocaleString()} (99.8%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
