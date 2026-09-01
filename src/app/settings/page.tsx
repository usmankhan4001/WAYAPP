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
  CreditCard,
  KeyRound,
  History,
  X,
} from 'lucide-react';
import { InfoTooltip } from '@/components/ui/Tooltip';
import { MetaSetupGuideModal } from '@/components/common/MetaSetupGuideModal';
import { MetaBillingSection } from '@/components/settings/MetaBillingSection';
import { Skeleton, SkeletonTableRow } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

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
  const [activeTab, setActiveTab] = useState<'gateway' | 'marketplace' | 'snippets' | 'billing' | 'api-keys' | 'audit-log'>('gateway');

  // Gateway Settings
  const [settings, setSettings] = useState<any>({
    wabaId: '',
    phoneNumberId: '',
    accessToken: '',
    webhookVerifyToken: 'whatsapp_cloud_webhook_token_2026',
    appSecret: '',
    businessName: 'My WhatsApp Business',
    businessPhone: '',
    defaultCountryCode: '+971',
    rateLimitPerSecond: 20,
    tierDailyLimit: 1000,
    isMockMode: false,
    isConnected: false,
    marketingMessagesEnabled: false,
    marketingMessagesPolicy: 'CLOUD_API_FALLBACK',
    metaAppId: '',
    metaAppSecret: '',
    allowedDomains: '',
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

  // API Keys
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(true);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState('read,write,messages:send,contacts:write');
  const [creatingKey, setCreatingKey] = useState(false);
  const [revealedKey, setRevealedKey] = useState<{ name: string; rawKey: string } | null>(null);
  const [rawKeyCopied, setRawKeyCopied] = useState(false);

  // Audit Log
  const [auditEntries, setAuditEntries] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditActorFilter, setAuditActorFilter] = useState('');

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

  const fetchApiKeys = () => {
    setApiKeysLoading(true);
    fetch('/api/settings/api-keys')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setApiKeys(data);
      })
      .catch(() => {})
      .finally(() => setApiKeysLoading(false));
  };

  const fetchAuditLog = (page = 1) => {
    setAuditLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (auditActionFilter) params.set('action', auditActionFilter);
    if (auditActorFilter) params.set('actorEmail', auditActorFilter);

    fetch(`/api/settings/audit-log?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.entries)) {
          setAuditEntries(data.entries);
          setAuditPage(data.page || 1);
          setAuditTotalPages(data.totalPages || 1);
        }
      })
      .catch(() => {})
      .finally(() => setAuditLoading(false));
  };

  useEffect(() => {
    fetchSettings();
    fetchModules();
    fetchSnippets();
  }, []);

  useEffect(() => {
    if (activeTab === 'api-keys') fetchApiKeys();
    if (activeTab === 'audit-log') fetchAuditLog(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setCreatingKey(true);
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim(), scopes: newKeyScopes.trim() || 'read,write' }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to create API key');

      setRevealedKey({ name: data.apiKey.name, rawKey: data.apiKey.rawKey });
      setNewKeyName('');
      setIsCreatingKey(false);
      fetchApiKeys();
    } catch (err: any) {
      setNotice({ text: err.message, success: false });
      setTimeout(() => setNotice(null), 5000);
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    if (!confirm('Revoke this API key? Any integration using it will stop working immediately.')) return;
    try {
      const res = await fetch(`/api/settings/api-keys/${id}`, { method: 'DELETE' });
      if (res.ok) fetchApiKeys();
    } catch {}
  };

  const handleCopyRawKey = () => {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey.rawKey);
    setRawKeyCopied(true);
    setTimeout(() => setRawKeyCopied(false), 2000);
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
          <h1 className="text-2xl font-normal text-slate-900 tracking-tight">Settings & App Switchboard</h1>
          <p className="text-xs text-slate-500">
            Configure official Meta Cloud API credentials, toggle modular apps on/off, and manage sales tools
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => setIsGuideOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-black/5 text-xs font-normal text-slate-700 flex items-center gap-1.5 shadow-2xs"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span>Meta Setup Guide</span>
          </button>

          <button
            onClick={handleDisconnect}
            className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 text-xs font-normal flex items-center gap-1.5 shadow-2xs"
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
              ? 'bg-black/5 text-emerald-800 border border-emerald-200'
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
          className={`px-4 py-2 rounded-xl text-xs font-normal transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'gateway'
              ? 'bg-slate-900 text-white '
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Meta Cloud API & Gateway</span>
        </button>

        <button
          onClick={() => setActiveTab('marketplace')}
          className={`px-4 py-2 rounded-xl text-xs font-normal transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'marketplace'
              ? 'bg-slate-900 text-white '
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>App Marketplace & Modules</span>
          <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[#1c1e21] text-[10px] font-normal">
            {modules.filter((m) => m.isEnabled).length}/{modules.length} ON
          </span>
        </button>

        <button
          onClick={() => setActiveTab('snippets')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'snippets'
              ? 'bg-slate-900 text-white shadow-2xs font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Canned Snippets ({snippets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'billing'
              ? 'bg-slate-900 text-white shadow-2xs font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
          <span>Billing & Meta Rates</span>
        </button>

        <button
          onClick={() => setActiveTab('api-keys')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'api-keys'
              ? 'bg-slate-900 text-white shadow-2xs font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
          <span>API Keys ({apiKeys.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit-log')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'audit-log'
              ? 'bg-slate-900 text-white shadow-2xs font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5 text-emerald-400" />
          <span>Audit Log</span>
        </button>
      </div>

      {/* TAB 1: META CLOUD API & GATEWAY */}
      {activeTab === 'gateway' && (
        <div className="space-y-4">
          {/* Connection Status Card */}
          <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-normal text-slate-400 uppercase tracking-wider">
                  Direct Gateway Connection Status
                </span>
              </div>
              <h3 className="text-xs font-normal text-white">
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
                <h3 className="text-xs font-normal text-slate-900 uppercase tracking-wider">
                  Meta WhatsApp Cloud API Credentials
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-xs font-normal text-slate-700">
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
                    <label className="text-xs font-normal text-slate-700">
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
                  <label className="text-xs font-normal text-slate-700">
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
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-black/5 text-slate-700 text-xs font-normal flex items-center gap-1.5 shadow-2xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
                      <span>{testing ? 'Scanning Diagnostics...' : 'Deep Connection Diagnostics'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPinModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-black/5 text-xs font-normal shadow-2xs"
                    >
                      1-Click Register Phone (2FA)
                    </button>
                  </div>

                  {testDetails?.phoneDetails && (
                    <div className="text-xs text-[#1c1e21] font-normal flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verified: {testDetails.phoneDetails.verified_name || 'Account Active'}</span>
                    </div>
                  )}
                </div>

                {testDetails?.phoneDetails && (
                  <div className="p-3 rounded-xl bg-black/5 border border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-normal">Display Phone</span>
                      <p className="font-normal font-mono text-slate-800">{testDetails.phoneDetails.display_phone_number || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-normal">Display Name</span>
                      <p className={`font-normal ${testDetails.phoneDetails.name_status === 'APPROVED' ? 'text-[#1c1e21]' : 'text-amber-700'}`}>
                        {testDetails.phoneDetails.name_status || (testDetails.phoneDetails.verified_name ? 'APPROVED' : 'PENDING')}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-normal">Quality Rating</span>
                      <p className="font-normal text-[#1c1e21]">{testDetails.phoneDetails.quality_rating || 'GREEN'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-normal">Messaging Tier</span>
                      <p className="font-normal text-slate-800">{testDetails.phoneDetails.messaging_tier || 'STANDARD'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-normal">Registration Status</span>
                      <p className="font-normal text-[#1c1e21]">{testDetails.phoneDetails.code_verification_status || 'VERIFIED'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Webhook Endpoint Setup */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Webhook className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-normal text-slate-900 uppercase tracking-wider">
                  Meta Webhook Configuration
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-xs font-normal text-slate-700">Webhook Callback URL</label>
                    <InfoTooltip content="Paste this Callback URL in Meta Developer Portal > WhatsApp > Configuration." />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono bg-black/5 text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={handleCopyWebhook}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-black/5 text-slate-700 text-xs font-normal flex items-center gap-1 shadow-2xs"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <label className="text-xs font-normal text-slate-700">Verify Token</label>
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
                      <label className="text-xs font-normal text-slate-700">App Secret (HMAC SHA-256)</label>
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
                <h3 className="text-xs font-normal text-slate-900 uppercase tracking-wider">
                  Broadcast Defaults & Throttling
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-normal text-slate-700 mb-1">Business Display Name</label>
                  <input
                    type="text"
                    value={settings.businessName || ''}
                    onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-normal text-slate-700 mb-1">Default Country Code</label>
                  <input
                    type="text"
                    value={settings.defaultCountryCode || '+1'}
                    onChange={(e) => setSettings({ ...settings, defaultCountryCode: e.target.value })}
                    placeholder="+1 or +971"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-normal text-slate-700 mb-1">Rate Limit (Msgs / Sec)</label>
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
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-normal  transition-all disabled:opacity-50"
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
          <div className="p-4 rounded-2xl bg-linear-to-br from-slate-900 to-slate-800 text-white space-y-1 ">
            <h3 className="font-normal text-sm text-white flex items-center gap-1.5">
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
                className={`px-3 py-1.5 rounded-xl text-xs font-normal transition-all shrink-0 ${
                  moduleCategoryFilter === cat.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-black/5'
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
                      : 'bg-black/5 border-slate-200/60 opacity-75'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                            mod.isEnabled
                              ? 'bg-[#e6ffda] text-[#1c1e21]'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-normal text-xs text-slate-900">{mod.name}</h4>
                          <span className="text-[10px] font-normal text-slate-400 uppercase tracking-wider">
                            {mod.category}
                          </span>
                        </div>
                      </div>

                      {/* 1-Click Toggle Switch */}
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={() => handleToggleModule(mod.id, mod.isEnabled)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          mod.isEnabled ? 'bg-whatsapp-green' : 'bg-slate-300'
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
                      Status: <strong className={mod.isEnabled ? 'text-[#1c1e21]' : 'text-slate-500'}>{mod.isEnabled ? 'Active' : 'Disabled'}</strong>
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
              <h3 className="font-normal text-sm text-slate-900">Canned Sales Snippets & Shortcuts</h3>
              <p className="text-xs text-slate-500">
                Sales agents can type "/" in live chat to insert these pre-saved messages instantly.
              </p>
            </div>

            <button
              onClick={() => setIsAddingSnippet(!isAddingSnippet)}
              className="px-3.5 py-1.5 rounded-xl bg-whatsapp-green hover:bg-emerald-700 text-white text-xs font-normal flex items-center gap-1.5  transition-all self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingSnippet ? 'Cancel' : 'New Snippet'}</span>
            </button>
          </div>

          {/* Add Snippet Form Drawer */}
          {isAddingSnippet && (
            <form onSubmit={handleCreateSnippet} className="p-4 rounded-2xl bg-white border border-slate-200  space-y-3 animate-in fade-in duration-150">
              <h4 className="font-normal text-xs text-slate-900 uppercase tracking-wider">Create New Sales Shortcut</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-normal text-slate-700 mb-1">Shortcut Trigger (Starts with /)</label>
                  <input
                    type="text"
                    placeholder="/pricing or /brochure"
                    value={newShortcut}
                    onChange={(e) => setNewShortcut(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-normal text-slate-700 mb-1">Snippet Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Standard Pricing List"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-normal text-slate-700 mb-1">Category</label>
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
                <label className="block text-xs font-normal text-slate-700 mb-1">Message Content to Insert</label>
                <textarea
                  rows={3}
                  placeholder="Type the full WhatsApp text message..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingSnippet(false)}
                  className="px-3.5 py-1.5 text-xs font-normal rounded-xl bg-slate-100 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-normal rounded-xl bg-whatsapp-green text-white shadow-xs"
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
                    <span className="font-mono font-normal text-xs text-emerald-800 bg-[#e6ffda] px-2 py-0.5 rounded-full">
                      {s.shortcut}
                    </span>
                    <h4 className="font-normal text-xs text-slate-900 truncate">{s.title}</h4>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
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
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-full transition-colors shrink-0"
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

      {/* TAB 4: META BILLING & CONVERSATION PRICING */}
      {activeTab === 'billing' && <MetaBillingSection />}

      {/* TAB 5: API KEY MANAGEMENT */}
      {activeTab === 'api-keys' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-normal text-sm text-slate-900">Developer API Keys</h3>
              <p className="text-xs text-slate-500">
                Keys authenticate requests to the Public REST API (<code className="font-mono text-[11px]">/api/v1/*</code>) via the <code className="font-mono text-[11px]">X-API-Key</code> header.
              </p>
            </div>

            <button
              onClick={() => setIsCreatingKey(!isCreatingKey)}
              className="px-3.5 py-1.5 rounded-xl bg-whatsapp-green hover:bg-emerald-700 text-white text-xs font-normal flex items-center gap-1.5 transition-all self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreatingKey ? 'Cancel' : 'New API Key'}</span>
            </button>
          </div>

          {/* Create Key Form */}
          {isCreatingKey && (
            <form onSubmit={handleCreateApiKey} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 animate-in fade-in duration-150">
              <h4 className="font-normal text-xs text-slate-900 uppercase tracking-wider">Generate New API Key</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-normal text-slate-700 mb-1">Key Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Zapier Integration"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-xs font-normal text-slate-700">Scopes (comma-separated)</label>
                    <InfoTooltip content="e.g. read, write, messages:send, contacts:write. Use '*' for full access." />
                  </div>
                  <input
                    type="text"
                    value={newKeyScopes}
                    onChange={(e) => setNewKeyScopes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingKey(false)}
                  className="px-3.5 py-1.5 text-xs font-normal rounded-xl bg-slate-100 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingKey || !newKeyName.trim()}
                  className="px-4 py-1.5 text-xs font-normal rounded-xl bg-whatsapp-green text-white shadow-xs disabled:opacity-50"
                >
                  {creatingKey ? 'Generating...' : 'Generate Key'}
                </button>
              </div>
            </form>
          )}

          {/* Newly created key reveal */}
          {revealedKey && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-900">
                  "{revealedKey.name}" created — copy this key now
                </h4>
                <button onClick={() => setRevealedKey(null)} className="text-amber-500 hover:text-amber-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-amber-800">
                This is the only time the full key is shown. It cannot be retrieved again — store it somewhere safe.
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={revealedKey.rawKey}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 font-mono bg-white text-slate-800"
                />
                <button
                  type="button"
                  onClick={handleCopyRawKey}
                  className="px-3.5 py-2 rounded-xl border border-amber-300 bg-white hover:bg-amber-100 text-amber-800 text-xs font-normal flex items-center gap-1 shrink-0"
                >
                  {rawKeyCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{rawKeyCopied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Keys List */}
          {apiKeysLoading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3.5 rounded-2xl bg-white border border-slate-200">
                  <Skeleton width={220} height={14} className="mb-2" />
                  <Skeleton width={140} height={11} />
                </div>
              ))}
            </div>
          ) : apiKeys.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="No API keys yet"
              description="Generate a key to authenticate external integrations against the Public REST API."
              actionLabel="New API Key"
              onAction={() => setIsCreatingKey(true)}
            />
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {apiKeys.map((k) => (
                <div
                  key={k.id}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-normal text-xs text-slate-900">{k.name}</h4>
                      <span className="font-mono font-normal text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {k.keyPrefix}••••••••
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Scopes: <span className="font-mono">{k.scopes}</span>
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Created {new Date(k.createdAt).toLocaleDateString()}
                      {k.lastUsedAt ? ` • Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : ' • Never used'}
                      {k.user?.email ? ` • by ${k.user.email}` : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRevokeApiKey(k.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-full transition-colors shrink-0"
                    title="Revoke key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: AUDIT LOG */}
      {activeTab === 'audit-log' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-normal text-sm text-slate-900">Security & Admin Audit Log</h3>
            <p className="text-xs text-slate-500">Track logins, settings changes, module toggles, and API key activity.</p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
            >
              <option value="">All Actions</option>
              <option value="LOGIN_SUCCESS">Login Success</option>
              <option value="LOGIN_FAILED">Login Failed</option>
              <option value="SETTINGS_UPDATED">Settings Updated</option>
              <option value="AUTH_CONFIG_UPDATED">Auth Config Updated</option>
              <option value="MODULE_TOGGLED">Module Toggled</option>
              <option value="API_KEY_CREATED">API Key Created</option>
              <option value="API_KEY_REVOKED">API Key Revoked</option>
              <option value="ROLE_CHANGED">Role Changed</option>
            </select>
            <input
              type="text"
              placeholder="Filter by actor email..."
              value={auditActorFilter}
              onChange={(e) => setAuditActorFilter(e.target.value)}
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300"
            />
            <button
              onClick={() => fetchAuditLog(1)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-black/5 text-slate-700 text-xs font-normal flex items-center gap-1.5 shadow-2xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>
          </div>

          {/* Entries Table */}
          <div className="card-base overflow-hidden">
            {auditLoading ? (
              <table className="w-full text-left border-collapse text-xs">
                <tbody>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonTableRow key={i} columns={5} />
                  ))}
                </tbody>
              </table>
            ) : auditEntries.length === 0 ? (
              <EmptyState
                icon={History}
                title="No audit events found"
                description="Events like logins, settings changes, and API key activity will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Actor</th>
                      <th className="py-2.5 px-4">Target</th>
                      <th className="py-2.5 px-4">IP Address</th>
                      <th className="py-2.5 px-4">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              entry.action.includes('FAILED')
                                ? 'bg-rose-50 text-rose-700'
                                : entry.action.includes('SUCCESS') || entry.action.includes('CREATED')
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {entry.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">{entry.actorEmail || 'System'}</td>
                        <td className="py-2.5 px-4 text-slate-500">
                          {entry.targetType ? `${entry.targetType}${entry.targetId ? ` (${entry.targetId.slice(0, 8)}…)` : ''}` : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">{entry.ipAddress || '—'}</td>
                        <td className="py-2.5 px-4 text-slate-500">{new Date(entry.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {auditTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => fetchAuditLog(auditPage - 1)}
                disabled={auditPage <= 1}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-slate-500">Page {auditPage} of {auditTotalPages}</span>
              <button
                onClick={() => fetchAuditLog(auditPage + 1)}
                disabled={auditPage >= auditTotalPages}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Meta Setup Guide Modal */}
      <MetaSetupGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {/* 2FA Phone Registration Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
            <div>
              <h3 className="text-sm font-normal text-slate-900">1-Click Phone Number 2FA Registration</h3>
              <p className="text-xs text-slate-500 mt-1">
                Register your business phone number ID directly on the Meta Cloud API gateway with a 6-digit PIN.
              </p>
            </div>

            <div>
              <label className="block text-xs font-normal text-slate-700 mb-1">
                6-Digit 2FA PIN
              </label>
              <input
                type="text"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full px-3 py-2 text-sm text-center font-mono font-normal tracking-widest rounded-full border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Choose any 6-digit PIN to secure your WhatsApp Cloud number.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="px-3.5 py-1.5 rounded-full border border-slate-300 text-slate-700 text-xs font-normal hover:bg-black/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRegisterPhone}
                disabled={isRegistering || pinInput.length !== 6}
                className="px-4 py-1.5 rounded-full bg-whatsapp-green hover:bg-emerald-700 text-white text-xs font-normal disabled:opacity-50"
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
