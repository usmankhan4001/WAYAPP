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
  ShieldCheck,
  Layers,
  Sparkles,
  Zap,
  UserCheck,
  Send,
  GitBranch,
  Bot,
  Share2,
  ShoppingBag,
  Code2,
  Trash2,
  Plus,
  Search,
} from 'lucide-react';
import { InfoTooltip } from '@/components/ui/Tooltip';
import { MetaSetupGuideModal } from '@/components/common/MetaSetupGuideModal';

const MODULE_ICONS: Record<string, any> = {
  Sparkles,
  Zap,
  UserCheck,
  Send,
  GitBranch,
  Bot,
  Share2,
  ShoppingBag,
  Code2,
  Layers,
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'gateway' | 'marketplace' | 'snippets'>('gateway');

  // Gateway Settings
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
    marketingMessagesEnabled: false,
    marketingMessagesPolicy: 'CLOUD_API_FALLBACK',
    metaAppId: '',
    metaAppSecret: '',
    allowedDomains: 'gccstartup.com',
  });

  // App Modules Switchboard
  const [modules, setModules] = useState<any[]>([]);
  const [moduleCategoryFilter, setModuleCategoryFilter] = useState('ALL');
  const [togglingModule, setTogglingModule] = useState<string | null>(null);

  // Canned Snippets
  const [snippets, setSnippets] = useState<any[]>([]);
  const [snippetSearch, setSnippetSearch] = useState('');
  const [isAddingSnippet, setIsAddingSnippet] = useState(false);
  const [newShortcut, setNewShortcut] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('GENERAL');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<{ text: string; success: boolean } | null>(null);
  const [testDetails, setTestDetails] = useState<any | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const [isRegistering, setIsRegistering] = useState(false);
  const [pinInput, setPinInput] = useState('123456');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  const fetchSettings = () => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data) setSettings(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchModules = () => {
    fetch('/api/modules')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.modules)) setModules(data.modules);
      })
      .catch(() => {});
  };

  const fetchSnippets = () => {
    fetch('/api/chat/snippets')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.snippets)) setSnippets(data.snippets);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchSettings();
    fetchModules();
    fetchSnippets();
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

  const handleRegisterPhone = async () => {
    setIsRegistering(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          action: 'REGISTER_PHONE',
          pin: pinInput || '123456',
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to register phone');

      setNotice({ text: data.message || 'Phone registered successfully with Meta Cloud API!', success: true });
      setIsPinModalOpen(false);
      handleTestConnection();
    } catch (err: any) {
      setNotice({ text: err.message, success: false });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleToggleModule = async (moduleId: string, currentEnabled: boolean) => {
    setTogglingModule(moduleId);
    try {
      const res = await fetch('/api/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, isEnabled: !currentEnabled }),
      });
      if (res.ok) {
        fetchModules();
      }
    } catch {} finally {
      setTogglingModule(null);
    }
  };

  const handleCreateSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShortcut.trim() || !newTitle.trim() || !newContent.trim()) return;

    try {
      const res = await fetch('/api/chat/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortcut: newShortcut,
          title: newTitle,
          content: newContent,
          category: newCategory,
        }),
      });
      if (res.ok) {
        setNewShortcut('');
        setNewTitle('');
        setNewContent('');
        setIsAddingSnippet(false);
        fetchSnippets();
      }
    } catch {}
  };

  const handleDeleteSnippet = async (id: string) => {
    if (!confirm('Are you sure you want to delete this snippet?')) return;
    try {
      const res = await fetch(`/api/chat/snippets?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchSnippets();
    } catch {}
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

  const filteredModules = modules.filter((m) => {
    if (moduleCategoryFilter === 'ALL') return true;
    return m.category === moduleCategoryFilter;
  });

  const filteredSnippets = snippets.filter(
    (s) =>
      s.shortcut.toLowerCase().includes(snippetSearch.toLowerCase()) ||
      s.title.toLowerCase().includes(snippetSearch.toLowerCase()) ||
      s.content.toLowerCase().includes(snippetSearch.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Settings & App Switchboard</h1>
          <p className="text-xs text-slate-500">
            Configure official Meta Cloud API credentials, toggle modular apps on/off, and manage sales tools
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => setIsGuideOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span>Meta Setup Guide</span>
          </button>

          <button
            onClick={handleDisconnect}
            className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
            title="Disconnect and re-enter setup"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Disconnect</span>
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 shadow-2xs ${
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

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('gateway')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'gateway'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Meta Cloud API & Gateway</span>
        </button>

        <button
          onClick={() => setActiveTab('marketplace')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'marketplace'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>App Marketplace & Modules</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 text-[10px] font-bold">
            {modules.filter((m) => m.isEnabled).length}/{modules.length} ON
          </span>
        </button>

        <button
          onClick={() => setActiveTab('snippets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'snippets'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Canned Snippets ({snippets.length})</span>
        </button>
      </div>

      {/* TAB 1: META CLOUD API & GATEWAY */}
      {activeTab === 'gateway' && (
        <div className="space-y-4">
          {/* Connection Status Card */}
          <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Direct Gateway Connection Status
                </span>
              </div>
              <h3 className="text-xs font-bold text-white">
                {settings.isMockMode ? 'Virtual Simulator Active' : 'Meta Cloud API v21.0 Live & Activated'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {settings.isMockMode
                  ? 'Local virtual simulator mode is active.'
                  : 'Direct first-party connection to Meta Graph API v21.0 with 0% markup and zero proxy hops.'}
              </p>
            </div>

            <label className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 cursor-pointer self-start sm:self-auto">
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
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Key className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Meta WhatsApp Cloud API Credentials
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Phone Number ID <span className="text-rose-500">*</span>
                    </label>
                    <InfoTooltip content="Found in Meta for Developers > WhatsApp > API Setup." />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. 100654321987654"
                    value={settings.phoneNumberId || ''}
                    onChange={(e) => setSettings({ ...settings, phoneNumberId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      WhatsApp Business Account ID (WABA ID) <span className="text-rose-500">*</span>
                    </label>
                    <InfoTooltip content="Found in Meta Business Manager > WhatsApp Accounts." />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. 100987654321098"
                    value={settings.wabaId || ''}
                    onChange={(e) => setSettings({ ...settings, wabaId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Permanent System User Access Token <span className="text-rose-500">*</span>
                  </label>
                  <InfoTooltip content="Permanent Token with whatsapp_business_messaging and whatsapp_business_management permissions." />
                </div>
                <input
                  type="password"
                  placeholder="EAAG..."
                  value={settings.accessToken || ''}
                  onChange={(e) => setSettings({ ...settings, accessToken: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>

              {/* Test Connection Button & Diagnostics */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testing}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
                      <span>{testing ? 'Scanning Diagnostics...' : 'Deep Connection Diagnostics'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPinModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs"
                    >
                      1-Click Register Phone (2FA)
                    </button>
                  </div>

                  {testDetails?.phoneDetails && (
                    <div className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verified: {testDetails.phoneDetails.verified_name || 'Account Active'}</span>
                    </div>
                  )}
                </div>

                {testDetails?.phoneDetails && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Display Phone</span>
                      <p className="font-bold font-mono text-slate-800">{testDetails.phoneDetails.display_phone_number || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Display Name</span>
                      <p className={`font-bold ${testDetails.phoneDetails.name_status === 'APPROVED' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {testDetails.phoneDetails.name_status || (testDetails.phoneDetails.verified_name ? 'APPROVED' : 'PENDING')}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Quality Rating</span>
                      <p className="font-bold text-emerald-700">{testDetails.phoneDetails.quality_rating || 'GREEN'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Messaging Tier</span>
                      <p className="font-bold text-slate-800">{testDetails.phoneDetails.messaging_tier || 'STANDARD'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Registration Status</span>
                      <p className="font-bold text-emerald-700">{testDetails.phoneDetails.code_verification_status || 'VERIFIED'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Webhook Endpoint Setup */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Webhook className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Meta Webhook Configuration
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-xs font-bold text-slate-700">Webhook Callback URL</label>
                    <InfoTooltip content="Paste this Callback URL in Meta Developer Portal > WhatsApp > Configuration." />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono bg-slate-50 text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={handleCopyWebhook}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1 shadow-2xs"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <label className="text-xs font-bold text-slate-700">Verify Token</label>
                      <InfoTooltip content="Verification token for the hub.challenge handshake." />
                    </div>
                    <input
                      type="text"
                      value={settings.webhookVerifyToken || ''}
                      onChange={(e) => setSettings({ ...settings, webhookVerifyToken: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <label className="text-xs font-bold text-slate-700">App Secret (HMAC SHA-256)</label>
                      <InfoTooltip content="App Secret from Meta App Settings > Basic for cryptographic signature verification." />
                    </div>
                    <input
                      type="password"
                      placeholder="App Secret"
                      value={settings.appSecret || ''}
                      onChange={(e) => setSettings({ ...settings, appSecret: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Business Profile & Throttling */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Broadcast Defaults & Throttling
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Business Display Name</label>
                  <input
                    type="text"
                    value={settings.businessName || ''}
                    onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Default Country Code</label>
                  <input
                    type="text"
                    value={settings.defaultCountryCode || '+1'}
                    onChange={(e) => setSettings({ ...settings, defaultCountryCode: e.target.value })}
                    placeholder="+1 or +971"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rate Limit (Msgs / Sec)</label>
                  <input
                    type="number"
                    min="1"
                    max="80"
                    value={settings.rateLimitPerSecond || 20}
                    onChange={(e) => setSettings({ ...settings, rateLimitPerSecond: parseInt(e.target.value, 10) || 20 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: APP MARKETPLACE & MODULAR SWITCHBOARD */}
      {activeTab === 'marketplace' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-1 shadow-md">
            <h3 className="font-black text-sm text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Plug-and-Play Module Switchboard</span>
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Enable only what your sales & operations team needs. When a module is toggled OFF, its navigation links, chat toolbars, and background workers are cleanly deactivated to keep your team's workflow fast, simple, and clutter-free.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'ALL', label: 'All Modules' },
              { id: 'SALES_AI', label: 'Sales & AI Co-Pilot' },
              { id: 'SALES_TOOLS', label: 'Sales Tools & CRM' },
              { id: 'ENGAGEMENT', label: 'Engagement & Campaigns' },
              { id: 'AUTOMATION', label: 'Flows & Bots' },
              { id: 'CHANNELS', label: 'Social Channels' },
              { id: 'INTEGRATIONS', label: 'E-Commerce & Apps' },
              { id: 'DEVELOPER', label: 'Developer & Webhooks' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setModuleCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  moduleCategoryFilter === cat.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Modules Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredModules.map((mod) => {
              const IconComp = MODULE_ICONS[mod.icon] || Zap;
              const isToggling = togglingModule === mod.id;

              return (
                <div
                  key={mod.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                    mod.isEnabled
                      ? 'bg-white border-slate-200 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200/60 opacity-75'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                            mod.isEnabled
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900">{mod.name}</h4>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            {mod.category}
                          </span>
                        </div>
                      </div>

                      {/* 1-Click Toggle Switch */}
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={() => handleToggleModule(mod.id, mod.isEnabled)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          mod.isEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                        } ${isToggling ? 'opacity-50' : ''}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            mod.isEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-normal">{mod.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                    <span className="font-medium text-slate-500">
                      Status: <strong className={mod.isEnabled ? 'text-emerald-700' : 'text-slate-500'}>{mod.isEnabled ? 'Active' : 'Disabled'}</strong>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">ID: {mod.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CANNED SNIPPETS MANAGER */}
      {activeTab === 'snippets' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Canned Sales Snippets & Shortcuts</h3>
              <p className="text-xs text-slate-500">
                Sales agents can type "/" in live chat to insert these pre-saved messages instantly.
              </p>
            </div>

            <button
              onClick={() => setIsAddingSnippet(!isAddingSnippet)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingSnippet ? 'Cancel' : 'New Snippet'}</span>
            </button>
          </div>

          {/* Add Snippet Form Drawer */}
          {isAddingSnippet && (
            <form onSubmit={handleCreateSnippet} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 animate-in fade-in duration-150">
              <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Create New Sales Shortcut</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Shortcut Trigger (Starts with /)</label>
                  <input
                    type="text"
                    placeholder="/pricing or /brochure"
                    value={newShortcut}
                    onChange={(e) => setNewShortcut(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Snippet Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Standard Pricing List"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="GENERAL">General</option>
                    <option value="PRICING">Pricing & Plans</option>
                    <option value="SUPPORT">Customer Support</option>
                    <option value="CLOSING">Deal Closing & Demo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message Content to Insert</label>
                <textarea
                  rows={3}
                  placeholder="Type the full WhatsApp text message..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingSnippet(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 text-white shadow-xs"
                >
                  Save Shortcut
                </button>
              </div>
            </form>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search shortcuts or message content..."
              value={snippetSearch}
              onChange={(e) => setSnippetSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
            />
          </div>

          {/* Snippets List */}
          <div className="grid grid-cols-1 gap-2.5">
            {filteredSnippets.map((s) => (
              <div
                key={s.id}
                className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg">
                      {s.shortcut}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 truncate">{s.title}</h4>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {s.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans whitespace-pre-wrap">{s.content}</p>
                  <span className="text-[10px] text-slate-400 block pt-1">
                    Used in chat {s.usageCount || 0} times
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteSnippet(s.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors shrink-0"
                  title="Delete shortcut"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {filteredSnippets.length === 0 && (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                No canned snippets found. Click "New Snippet" above to add your first sales shortcut!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Meta Setup Guide Modal */}
      <MetaSetupGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {/* 2FA Phone Registration Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">1-Click Phone Number 2FA Registration</h3>
              <p className="text-xs text-slate-500 mt-1">
                Register your business phone number ID directly on the Meta Cloud API gateway with a 6-digit PIN.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                6-Digit 2FA PIN
              </label>
              <input
                type="text"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full px-3 py-2 text-sm text-center font-mono font-bold tracking-widest rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Choose any 6-digit PIN to secure your WhatsApp Cloud number.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRegisterPhone}
                disabled={isRegistering || pinInput.length !== 6}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
              >
                {isRegistering ? 'Registering...' : 'Register PIN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
