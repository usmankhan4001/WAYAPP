'use client';

import React, { useState, useEffect } from 'react';
import {
  Key,
  Webhook,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  BookOpen,
  LogOut,
} from 'lucide-react';
import { InfoTooltip } from '@/components/ui/Tooltip';
import { MetaSetupGuideModal } from '@/components/common/MetaSetupGuideModal';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({
    wabaId: '',
    phoneNumberId: '',
    accessToken: '',
    webhookVerifyToken: 'whatsapp_cloud_webhook_token_2026',
    appSecret: '',
    businessName: 'My WhatsApp Business',
    businessPhone: '',
    defaultCountryCode: '+1',
    rateLimitPerSecond: 20,
    tierDailyLimit: 1000,
    isMockMode: false,
    isConnected: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<{ text: string; success: boolean } | null>(null);
  const [testDetails, setTestDetails] = useState<any | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const fetchSettings = () => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data) setSettings(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to save configuration');

      setNotice({ text: 'Configuration saved successfully!', success: true });
      fetchSettings();
    } catch (err: any) {
      setNotice({ text: err.message, success: false });
    } finally {
      setSaving(false);
      setTimeout(() => setNotice(null), 5000);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestDetails(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, action: 'TEST_CONNECTION' }),
      });
      const data = await res.json();
      setTestDetails(data);
      if (data.success) {
        setNotice({ text: data.message || 'Meta Cloud API Connected!', success: true });
      } else {
        setNotice({ text: data.message || 'Connection failed', success: false });
      }
    } catch (err: any) {
      setNotice({ text: err.message, success: false });
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Meta WhatsApp API? The setup gatekeeper will lock the platform until reconnected.')) return;
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DISCONNECT_META' }),
      });
      window.location.reload();
    } catch {}
  };

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/whatsapp`
    : 'http://localhost:3000/api/webhooks/whatsapp';

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Meta Cloud API Settings</h1>
          <p className="text-xs text-slate-500">
            Configure WhatsApp Business credentials, Webhooks, and broadcast throttling
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => setIsGuideOpen(true)}
            className="btn-secondary"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span>Meta Setup Guide</span>
          </button>

          <button
            onClick={handleDisconnect}
            className="btn-secondary text-rose-700 hover:bg-rose-50"
            title="Disconnect and re-enter setup"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Disconnect</span>
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            notice.success
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {notice.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Connection Status Card */}
      <div className="card-base p-4 bg-slate-900 text-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Gateway Connection Status
            </span>
          </div>
          <h3 className="text-xs font-semibold text-white">
            {settings.isMockMode ? 'Virtual Simulator Active' : 'Meta Cloud API Live & Activated'}
          </h3>
          <p className="text-[11px] text-slate-400">
            {settings.isMockMode
              ? 'Local virtual simulator mode is active.'
              : 'Connected to official Meta Graph API v21.0.'}
          </p>
        </div>

        <label className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer self-start sm:self-auto">
          <input
            type="checkbox"
            checked={settings.isMockMode}
            onChange={(e) => setSettings({ ...settings, isMockMode: e.target.checked })}
            className="w-3.5 h-3.5 text-emerald-600 rounded"
          />
          <span className="text-xs font-medium text-slate-200">Mock Mode</span>
        </label>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Section 1: Meta Cloud API Credentials */}
        <div className="card-base p-4 space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Key className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Meta WhatsApp Cloud API Credentials
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="text-xs font-medium text-slate-700">
                  Phone Number ID <span className="text-rose-500">*</span>
                </label>
                <InfoTooltip content="Found in Meta for Developers > WhatsApp > API Setup." />
              </div>
              <input
                type="text"
                placeholder="e.g. 100654321987654"
                value={settings.phoneNumberId || ''}
                onChange={(e) => setSettings({ ...settings, phoneNumberId: e.target.value })}
                className="input-base font-mono"
              />
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="text-xs font-medium text-slate-700">
                  WhatsApp Business Account ID (WABA ID) <span className="text-rose-500">*</span>
                </label>
                <InfoTooltip content="Found in Meta Business Manager > WhatsApp Accounts." />
              </div>
              <input
                type="text"
                placeholder="e.g. 100987654321098"
                value={settings.wabaId || ''}
                onChange={(e) => setSettings({ ...settings, wabaId: e.target.value })}
                className="input-base font-mono"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-xs font-medium text-slate-700">
                Permanent System User Access Token <span className="text-rose-500">*</span>
              </label>
              <InfoTooltip content="Permanent Token with whatsapp_business_messaging and whatsapp_business_management permissions." />
            </div>
            <input
              type="password"
              placeholder="EAAG..."
              value={settings.accessToken || ''}
              onChange={(e) => setSettings({ ...settings, accessToken: e.target.value })}
              className="input-base font-mono"
            />
          </div>

          {/* Test Connection Button */}
          <div className="pt-1 flex items-center justify-between">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="btn-secondary text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
              <span>{testing ? 'Testing Connection...' : 'Test Meta Connection'}</span>
            </button>

            {testDetails?.phoneDetails && (
              <div className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified: {testDetails.phoneDetails.verified_name || 'Account Active'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Webhook Endpoint Setup */}
        <div className="card-base p-4 space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Webhook className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Meta Webhook Configuration
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="text-xs font-medium text-slate-700">Webhook Callback URL</label>
                <InfoTooltip content="Paste this Callback URL in Meta Developer Portal > WhatsApp > Configuration." />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="input-base font-mono bg-slate-50 text-slate-600"
                />
                <button
                  type="button"
                  onClick={handleCopyWebhook}
                  className="btn-secondary px-3"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-xs font-medium text-slate-700">Verify Token</label>
                  <InfoTooltip content="Verification token for the hub.challenge handshake." />
                </div>
                <input
                  type="text"
                  value={settings.webhookVerifyToken || ''}
                  onChange={(e) => setSettings({ ...settings, webhookVerifyToken: e.target.value })}
                  className="input-base font-mono"
                />
              </div>

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-xs font-medium text-slate-700">App Secret (HMAC SHA-256)</label>
                  <InfoTooltip content="App Secret from Meta App Settings > Basic for cryptographic signature verification." />
                </div>
                <input
                  type="password"
                  placeholder="App Secret"
                  value={settings.appSecret || ''}
                  onChange={(e) => setSettings({ ...settings, appSecret: e.target.value })}
                  className="input-base font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Business Profile & Throttling */}
        <div className="card-base p-4 space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Broadcast Defaults & Throttling
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Business Display Name</label>
              <input
                type="text"
                value={settings.businessName || ''}
                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                className="input-base"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Default Country Code</label>
              <input
                type="text"
                value={settings.defaultCountryCode || '+1'}
                onChange={(e) => setSettings({ ...settings, defaultCountryCode: e.target.value })}
                placeholder="+1 or +971"
                className="input-base font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Rate Limit (Msgs / Sec)</label>
              <input
                type="number"
                min="1"
                max="80"
                value={settings.rateLimitPerSecond || 20}
                onChange={(e) => setSettings({ ...settings, rateLimitPerSecond: parseInt(e.target.value, 10) || 20 })}
                className="input-base font-mono"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>

      {/* Meta Setup Guide Modal */}
      <MetaSetupGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
