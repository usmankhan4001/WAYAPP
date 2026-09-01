'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  HelpCircle,
  BookOpen,
  Send,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { MetaSetupGuideModal } from './MetaSetupGuideModal';
import { useToast } from '@/components/ui/Toast';

interface InitialSetupGatekeeperProps {
  onActivationSuccess: (settings: any) => void;
}

export function InitialSetupGatekeeper({ onActivationSuccess }: InitialSetupGatekeeperProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'sandbox' | 'guided' | 'facebook' | 'manual'>('sandbox');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Form State
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [businessName, setBusinessName] = useState('My WhatsApp Business');
  const [defaultCountryCode, setDefaultCountryCode] = useState('+971');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('whatsapp_cloud_webhook_token_2026');

  // Verification & Activation State
  const [isTesting, setIsTesting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLaunchSandbox = async () => {
    setIsActivating(true);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ACTIVATE_CONNECTION',
          phoneNumberId: 'sandbox_phone_1001',
          wabaId: 'sandbox_waba_2001',
          accessToken: 'sandbox_token_mock_mode',
          businessName: 'WAYAPP Demo Store',
          businessPhone: '+971 50 123 4567',
          defaultCountryCode: '+971',
          webhookVerifyToken: 'whatsapp_sandbox_token',
          isMockMode: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to activate demo mode');
      }

      onActivationSuccess(data.settings);
    } catch (err: any) {
      setError(err.message);
      setIsActivating(false);
    }
  };

  const handleTestHandshake = async () => {
    if (!phoneNumberId.trim() || !wabaId.trim() || !accessToken.trim()) {
      setError('Please fill in your Phone Number ID, WABA ID, and Permanent Access Token.');
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
          isMockMode: false,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to authenticate with Meta Cloud API');
      }

      setTestResult(data);
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
          isMockMode: false,
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
    <div className="min-h-screen min-h-dvh w-full bg-muted flex flex-col justify-center items-center p-4 sm:p-6 overflow-y-auto">
      {/* Top Brand Banner */}
      <div className="max-w-xl w-full text-center space-y-2 mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary p-2.5 text-white shadow-lg ring-4 ring-primary/20 mb-2">
          <svg viewBox="0 0 512 512" fill="none" className="w-full h-full">
            <path d="M120 180L180 340L256 220L332 340L392 180" stroke="#FFFFFF" strokeWidth="52" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="392" cy="180" r="32" fill="#34d399" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Welcome to WAY<span className="text-primary">APP</span>
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          The all-in-one WhatsApp Marketing, Template Management & Live 2-Way Inbox Platform.
        </p>
      </div>

      {/* Main Setup Card */}
      <div className="card-base max-w-xl w-full bg-card shadow-xl overflow-hidden border border-border">
        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 border-b border-border bg-muted/80 p-1.5 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('sandbox')}
            className={`py-2 px-2 rounded-xl font-semibold transition-all text-center flex items-center justify-center gap-1.5 ${
              activeTab === 'sandbox'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Instant Demo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guided')}
            className={`py-2 px-2 rounded-xl font-semibold transition-all text-center flex items-center justify-center gap-1.5 ${
              activeTab === 'guided'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>Layman Setup</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('facebook')}
            className={`py-2 px-2 rounded-xl font-semibold transition-all text-center flex items-center justify-center gap-1.5 ${
              activeTab === 'facebook'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span>1-Click Connect</span>
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* TAB 1: Instant Sandbox Demo */}
          {activeTab === 'sandbox' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="text-center space-y-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-subtle text-primary border border-transparent">
                  <Sparkles className="w-3.5 h-3.5" />
                  Recommended for First-Time Users
                </span>
                <h2 className="text-lg font-bold text-foreground">Try Instant Interactive Sandbox</h2>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Explore the full WhatsApp 2-way inbox, test broadcasts, create flows, and try the CRM right now with realistic demo chats.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-muted-foreground">
                <div className="p-3 rounded-xl bg-muted border border-border flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>No Meta Developer account or credit card needed</span>
                </div>
                <div className="p-3 rounded-xl bg-muted border border-border flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Simulate incoming and outgoing WhatsApp customer messages</span>
                </div>
                <div className="p-3 rounded-xl bg-muted border border-border flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Pre-loaded with sample contacts, templates, and stages</span>
                </div>
                <div className="p-3 rounded-xl bg-muted border border-border flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Switch to real WhatsApp Cloud API anytime in Settings</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLaunchSandbox}
                disabled={isActivating}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
              >
                {isActivating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>{isActivating ? 'Launching Sandbox...' : 'Launch Instant Demo Sandbox'}</span>
              </button>
            </div>
          )}

          {/* TAB 2: Layman Guided Setup */}
          {activeTab === 'guided' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-bold text-foreground">Connect Your Meta WhatsApp Number</h2>
                <p className="text-xs text-muted-foreground">
                  Follow these 3 simple steps to connect your official Meta WhatsApp Business Cloud API.
                </p>
              </div>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="p-3.5 rounded-xl bg-muted border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Step 1: Open Meta for Developers</span>
                    <a
                      href="https://developers.facebook.com/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary font-semibold inline-flex items-center gap-1 hover:underline"
                    >
                      <span>Open Meta Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Log in to developers.facebook.com, select or create your App (type: Business), and add the WhatsApp product.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-foreground">Phone Number ID</label>
                      <span className="text-[10px] text-muted-foreground">Found in WhatsApp &gt; API Setup</span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. 100654321987654"
                      value={phoneNumberId}
                      onChange={(e) => setPhoneNumberId(e.target.value)}
                      className="input-base font-mono text-xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-foreground">WhatsApp Business Account ID (WABA ID)</label>
                      <span className="text-[10px] text-muted-foreground">Found in WhatsApp &gt; API Setup</span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. 100987654321098"
                      value={wabaId}
                      onChange={(e) => setWabaId(e.target.value)}
                      className="input-base font-mono text-xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-foreground">Permanent System User Access Token</label>
                      <button
                        type="button"
                        onClick={() => setIsGuideOpen(true)}
                        className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-1"
                      >
                        <HelpCircle className="w-3 h-3" />
                        <span>Where to get token?</span>
                      </button>
                    </div>
                    <input
                      type="password"
                      placeholder="EAAG..."
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      className="input-base font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleTestHandshake}
                    disabled={isTesting || !phoneNumberId || !wabaId || !accessToken}
                    className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
                  >
                    {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-primary" />}
                    <span>{isTesting ? 'Verifying Credentials with Meta...' : 'Test & Verify Connection'}</span>
                  </button>

                  {testResult && (
                    <div className="p-3 rounded-xl bg-brand-subtle border border-transparent space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center gap-2 text-xs font-semibold text-brand-subtle-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span>Verified: {testResult?.phoneDetails?.verified_name || 'WhatsApp Number Connected'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCompleteActivation}
                        disabled={isActivating}
                        className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
                      >
                        {isActivating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                        <span>Activate & Enter Platform</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Facebook Embedded Signup */}
          {activeTab === 'facebook' && (
            <div className="space-y-5 text-center animate-in fade-in duration-150">
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-foreground">1-Click Embedded Onboarding</h2>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Connect through the official Meta Embedded Signup dialog. Ideal for registered business accounts.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-4">
                <button
                  type="button"
                  onClick={() => toast.info('Meta Embedded Signup', 'Complete the Facebook Login popup to link your WhatsApp Business number.')}
                  className="w-full h-12 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-md transition-all"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>Continue with Facebook</span>
                </button>
                <p className="text-[11px] text-muted-foreground">
                  Meta will guide you to select your Business Manager and WhatsApp phone number.
                </p>
              </div>

              <div className="text-xs text-muted-foreground">
                Prefer manual entry?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('guided')}
                  className="text-primary font-semibold hover:underline"
                >
                  Switch to Guided Setup
                </button>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-muted border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Open Complete Setup Guide</span>
          </button>
          <span className="text-[11px] text-muted-foreground font-mono">Meta Graph v21.0</span>
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
