import React, { useState, useEffect } from 'react';
import { Printer, X, Copy, Check, Globe } from 'lucide-react';
import { CertificateTemplateRenderer } from './CertificateTemplates';

interface CertificateModalProps {
  cert: any;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ cert, onClose }) => {
  if (!cert) return null;

  // Auto-detect reachable host: if on localhost, point to the real LAN IP so phone cameras can connect!
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  
  const defaultHost = isLocalhost 
    ? `http://10.76.0.108:${window.location.port || '5000'}` 
    : (typeof window !== 'undefined' ? window.location.origin : 'http://10.76.0.108:5000');

  const [customHost, setCustomHost] = useState(defaultHost);
  const [showHostInput, setShowHostInput] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Reset img error if switching between different certificates
  useEffect(() => {
    setImgError(false);
  }, [cert?.certificate_code]);

  // Dynamically fetch actual host IP from backend network info
  useEffect(() => {
    fetch('/api/public/network-info')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.base_url && isLocalhost) {
          setCustomHost(data.base_url);
        }
      })
      .catch(() => {});
  }, [isLocalhost, cert?.certificate_code]);

  const verificationUrl = `${customHost}/?verify=${encodeURIComponent(cert.certificate_code)}`;
  
  // Primary local offline QR with standard quiet zone, fallback to public QR service if offline image failed
  const qrUrl = (cert.qr_code && !imgError) 
    ? cert.qr_code 
    : (imgError
      ? `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=15&ecc=M&data=${encodeURIComponent(verificationUrl)}`
      : `/api/public/qr?text=${encodeURIComponent(verificationUrl)}&cert_id=${encodeURIComponent(cert.certificate_code)}`);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-4 sm:p-7 shadow-2xl border border-slate-200 text-slate-800 my-auto">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-lg text-xs">
              Official Master Registry Artifact
            </span>
            <span className="font-mono text-xs text-slate-600 font-bold bg-slate-100 px-2 py-1 rounded-md">
              ID: {cert.certificate_code}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition"
              title="Copy Verification Link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reachable Phone Network Notice */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-600">
            <Globe className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>
              QR encodes phone-reachable address:{' '}
              <strong className="text-slate-800 font-mono">{customHost}</strong>
            </span>
          </div>
          <button
            onClick={() => setShowHostInput(!showHostInput)}
            className="text-blue-600 hover:text-blue-800 underline font-semibold text-[11px]"
          >
            {showHostInput ? 'Done' : 'Change Host IP'}
          </button>
          {showHostInput && (
            <div className="w-full pt-2 flex gap-2">
              <input
                type="text"
                value={customHost}
                onChange={(e) => setCustomHost(e.target.value)}
                placeholder="http://10.76.0.108:5000 or https://xyz.ngrok.app"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
          )}
        </div>

        {/* Standard Professional Certificate Render Frame */}
        <CertificateTemplateRenderer
          cert={cert}
          institutionName={cert.institution_name || cert.organization_name}
          eventTitle={cert.event_title}
          qrElement={
            <div className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-sm flex items-center justify-center flex-shrink-0">
              <img
                src={qrUrl}
                alt="Verification QR Code"
                onError={() => setImgError(true)}
                className="w-28 h-28 sm:w-32 sm:h-32 block object-contain"
              />
            </div>
          }
        />
      </div>
    </div>
  );
};
