'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Key,
  Webhook,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  BookOpen,
  Sparkles,
  Lock,
} from 'lucide-react';
import { MetaSetupGuideModal } from './MetaSetupGuideModal';

interface InitialSetupGatekeeperProps {
  onActivationSuccess: (settings: any) => void;
}

export function InitialSetupGatekeeper({ onActivationSuccess }: InitialSetupGatekeeperProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Form State
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isMockMode, setIsMockMode] = useState(false);
  const [businessName, setBusinessName] = useState('My WhatsApp Business');
  const [defaultCountryCode, setDefaultCountryCode] = useState('+971');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('whatsapp_cloud_webhook_token_2026');

  // Verification & Activation State
  const [isTesting, setIsTesting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/whatsapp`
    : 'http://localhost:3000/api/webhooks/whatsapp';

  const handleTestHandshake = async () => {
    if (!isMockMode && (!phoneNumberId.trim() || !wabaId.trim() || !accessToken.trim())) {
      setError('Please fill in your Phone Number ID, WABA ID, and Permanent Access Token, or enable Virtual Simulator.');
      return;
    }

    setIsTesting(true);
    setError(null);
    setTestResult(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST_CONNECTION',
          phoneNumberId: phoneNumberId.trim(),
          wabaId: wabaId.trim(),
          accessToken: accessToken.trim(),
          isMockMode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to authenticate with Meta Cloud API');
      }

      setTestResult(data);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCompleteActivation = async () => {
    setIsActivating(true);
    setError(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ACTIVATE_CONNECTION',
          phoneNumberId: phoneNumberId.trim(),
          wabaId: wabaId.trim(),
          accessToken: accessToken.trim(),
          businessName: testResult?.phoneDetails?.verified_name || businessName,
          businessPhone: testResult?.phoneDetails?.display_phone_number || '',
          defaultCountryCode,
          webhookVerifyToken,
          isMockMode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to activate connection');
      }

      onActivationSuccess(data.settings);
    } catch (err: any) {
      setError(err.message);
      setIsActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Top Brand Banner */}
      <div className="max-w-2xl w-full text-center space-y-2 mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-2 text-white shadow-lg ring-4 ring-emerald-500/10 mb-2">
          <svg viewBox="0 0 512 512" fill="none" className="w-full h-full">
            <path d="M120 180L180 340L256 220L332 340L392 180" stroke="#FFFFFF" strokeWidth="52" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="392" cy="180" r="32" fill="#34d399" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          WAY<span className="text-emerald-600">APP</span> — WhatsApp Platform Setup
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Connect and activate your official Meta WhatsApp Business Cloud API to start managing templates, contacts, and broadcast campaigns.
        </p>
      </div>

      {/* Main Setup Card */}
      <div className="card-base max-w-lg w-full bg-white shadow-xl overflow-hidden border border-slate-200">
        <div className="p-6 md:p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-slate-900">Connect your WhatsApp</h2>
            <p className="text-sm text-slate-500">
              Link your business number to start chatting with customers and sending broadcast campaigns.
            </p>
          </div>

          {/* Primary Action: Embedded Signup */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => alert('Meta Embedded Signup OAuth Flow will launch here.')}
              className="w-full h-12 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Continue with Facebook</span>
            </button>
            <p className="text-[11px] text-center text-slate-400 font-medium">
              1-Click Setup. We automatically configure your Meta APIs and webhooks.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-bold">OR</span>
            </div>
          </div>

          {/* Secondary Action: Virtual Simulator */}
          <button
            type="button"
            onClick={() => {
              setIsMockMode(true);
              setStep(2); // Jump directly to success test screen for simulator
              handleCompleteActivation(); // Auto activate mock mode
            }}
            className="w-full h-11 rounded-xl border-2 border-emerald-100 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Try Virtual Simulator (Instant Demo)</span>
          </button>
          
          {/* Error Alert */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Advanced Manual Setup Accordion */}
          <div className="pt-4 mt-4 border-t border-slate-100">
            <details className="group">
              <summary className="text-xs font-semibold text-slate-500 cursor-pointer list-none flex items-center gap-1 hover:text-slate-800">
                <ShieldCheck className="w-4 h-4" />
                <span>Advanced: Manual API Configuration</span>
                <span className="ml-auto transition group-open:rotate-180">▼</span>
              </summary>
              <div className="pt-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number ID</label>
                  <input type="text" placeholder="e.g. 100654321987654" value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} className="input-base font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">WABA ID</label>
                  <input type="text" placeholder="e.g. 100987654321098" value={wabaId} onChange={(e) => setWabaId(e.target.value)} className="input-base font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Permanent Access Token</label>
                  <input type="password" placeholder="EAAG..." value={accessToken} onChange={(e) => setAccessToken(e.target.value)} className="input-base font-mono" />
                </div>
                <button
                  type="button"
                  onClick={handleTestHandshake}
                  disabled={isTesting || !phoneNumberId || !wabaId || !accessToken}
                  className="btn-primary w-full mt-2"
                >
                  {isTesting ? 'Verifying...' : 'Verify Manual Credentials'}
                </button>
                {testResult && (
                  <button
                    type="button"
                    onClick={handleCompleteActivation}
                    className="btn-primary w-full bg-slate-900 hover:bg-slate-800"
                  >
                    Complete Manual Activation
                  </button>
                )}
              </div>
            </details>
          </div>

        </div>
      </div>

      {/* Guide Modal */}
      <MetaSetupGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
