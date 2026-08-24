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
      <div className="card-base max-w-2xl w-full bg-white shadow-xl overflow-hidden border border-slate-200">
        {/* Progress Tracker Bar */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50/70 text-xs">
          <div
            className={`p-3.5 flex items-center gap-2 border-r border-slate-200 ${
              step === 1 ? 'bg-white font-semibold text-slate-900' : 'text-slate-500'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                step >= 1 ? 'bg-slate-900 text-white' : 'bg-slate-200'
              }`}
            >
              1
            </span>
            <span className="truncate">Credentials</span>
          </div>

          <div
            className={`p-3.5 flex items-center gap-2 border-r border-slate-200 ${
              step === 2 ? 'bg-white font-semibold text-slate-900' : 'text-slate-500'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                step >= 2 ? 'bg-slate-900 text-white' : 'bg-slate-200'
              }`}
            >
              2
            </span>
            <span className="truncate">Verification</span>
          </div>

          <div
            className={`p-3.5 flex items-center gap-2 ${
              step === 3 ? 'bg-white font-semibold text-slate-900' : 'text-slate-500'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                step >= 3 ? 'bg-slate-900 text-white' : 'bg-slate-200'
              }`}
            >
              3
            </span>
            <span className="truncate">Activation</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="m-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Enter Credentials */}
        {step === 1 && (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Step 1: Meta Cloud API Credentials</h3>
                <p className="text-xs text-slate-500">
                  Enter your WhatsApp Business account credentials from Meta Developer Portal.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="btn-secondary h-8 px-2.5 text-xs text-emerald-700"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                <span>Setup Guide</span>
              </button>
            </div>

            {/* Virtual Simulator Mode Toggle */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-900 block">Virtual Simulator / Mock Mode</span>
                <span className="text-[11px] text-slate-500">
                  Test and explore the platform locally without live Meta charges or credentials.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMockMode}
                  onChange={(e) => setIsMockMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {!isMockMode && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Phone Number ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 100654321987654"
                      value={phoneNumberId}
                      onChange={(e) => setPhoneNumberId(e.target.value)}
                      className="input-base font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      WABA ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 100987654321098"
                      value={wabaId}
                      onChange={(e) => setWabaId(e.target.value)}
                      className="input-base font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Permanent System User Access Token <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="EAAG..."
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    className="input-base font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Generated under Meta Business Settings &gt; System Users with <code>whatsapp_business_messaging</code> permissions.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">Meta Graph API v21.0</span>
              <button
                type="button"
                onClick={handleTestHandshake}
                disabled={isTesting}
                className="btn-primary px-4"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Verifying with Meta...' : 'Verify Connection'}</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Live Verification Result */}
        {step === 2 && (
          <div className="p-6 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Step 2: Meta Connection Verified</h3>
              <p className="text-xs text-slate-500">
                Your Meta WhatsApp credentials were successfully validated.
              </p>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{testResult?.message || 'Meta Cloud API Connected'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-emerald-200/80">
                <div>
                  <span className="text-slate-500 block text-[11px]">Business Name:</span>
                  <span className="font-medium text-slate-900">
                    {testResult?.phoneDetails?.verified_name || businessName}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Phone Number:</span>
                  <span className="font-mono font-medium text-slate-900">
                    {testResult?.phoneDetails?.display_phone_number || (isMockMode ? '+1 (555) 019-9823' : 'Verified')}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Quality Rating:</span>
                  <span className="badge-emerald mt-0.5">
                    {testResult?.phoneDetails?.quality_rating || 'GREEN (High)'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Gateway Status:</span>
                  <span className="font-medium text-emerald-700">Authenticated & Ready</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-secondary"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn-primary"
              >
                <span>Next: Webhook & Activation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Webhook Verification & Activation */}
        {step === 3 && (
          <div className="p-6 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Step 3: Webhook Configuration & Final Activation</h3>
              <p className="text-xs text-slate-500">
                Configure your webhook callback to receive delivery receipts (double blue ticks) and inbound customer replies.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Webhook Callback URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="input-base font-mono bg-slate-50 text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      setCopiedWebhook(true);
                      setTimeout(() => setCopiedWebhook(false), 2000);
                    }}
                    className="btn-secondary px-3"
                  >
                    {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedWebhook ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Webhook Verify Token</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={webhookVerifyToken}
                    onChange={(e) => setWebhookVerifyToken(e.target.value)}
                    className="input-base font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookVerifyToken);
                      setCopiedToken(true);
                      setTimeout(() => setCopiedToken(false), 2000);
                    }}
                    className="btn-secondary px-3"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
              <p className="font-medium text-slate-800 mb-0.5">Ready to go live:</p>
              <p className="text-[11px] text-slate-500">
                Clicking below will activate the Meta Gateway and unlock your broadcast campaigns, template manager, and 2-way inbox.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-secondary"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleCompleteActivation}
                disabled={isActivating}
                className="btn-primary px-5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isActivating ? 'Activating Gateway...' : 'Activate & Launch Platform'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Guide Modal */}
      <MetaSetupGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
