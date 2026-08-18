'use client';

import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Key,
  Webhook,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
  Copy,
  Check,
} from 'lucide-react';

interface MetaSetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MetaSetupGuideModal({ isOpen, onClose }: MetaSetupGuideModalProps) {
  const [activeTab, setActiveTab] = useState<number>(1);
  const [copiedToken, setCopiedToken] = useState(false);

  if (!isOpen) return null;

  const steps = [
    {
      num: 1,
      title: 'Meta Developer App',
      icon: ShieldCheck,
    },
    {
      num: 2,
      title: 'Permanent Token & IDs',
      icon: Key,
    },
    {
      num: 3,
      title: 'Webhook Integration',
      icon: Webhook,
    },
    {
      num: 4,
      title: 'Payment & Live Phone',
      icon: CreditCard,
    },
    {
      num: 5,
      title: 'Quality & Scaling Tiers',
      icon: Sparkles,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full my-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Meta WhatsApp Cloud API Production Setup Guide
              </h3>
              <p className="text-xs text-slate-500">
                Step-by-step instructions to connect your official WhatsApp Business number and go live
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Tabs Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 overflow-x-auto px-4 shrink-0">
          {steps.map((s) => {
            const Icon = s.icon;
            const isSelected = activeTab === s.num;
            return (
              <button
                key={s.num}
                onClick={() => setActiveTab(s.num)}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
                  isSelected
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {s.num}
                </span>
                <span>{s.title}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-700 leading-relaxed">
          {/* STEP 1 */}
          {activeTab === 1 && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                <h4 className="font-bold text-sm">Step 1: Create a Meta Developer Account & WhatsApp App</h4>
                <p className="text-xs">
                  To send official WhatsApp templates, you need an application in the Meta for Developers portal.
                </p>
              </div>

              <ol className="space-y-3 list-decimal list-inside bg-slate-50 p-4 rounded-xl border border-slate-200">
                <li className="font-semibold text-slate-900">
                  Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-emerald-700 underline inline-flex items-center gap-1">Meta for Developers <ExternalLink className="w-3 h-3" /></a> and log in with your Facebook account.
                </li>
                <li>Click <strong>&ldquo;My Apps&rdquo;</strong> in the top-right corner, then click <strong>&ldquo;Create App&rdquo;</strong>.</li>
                <li>Select <strong>&ldquo;Other&rdquo;</strong> &gt; Next &gt; Select <strong>&ldquo;Business&rdquo;</strong> type.</li>
                <li>Enter your App Display Name and link your official <strong>Meta Business Account</strong>.</li>
                <li>On the App Dashboard, scroll to <strong>&ldquo;WhatsApp&rdquo;</strong> and click <strong>&ldquo;Set up&rdquo;</strong>.</li>
              </ol>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-blue-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Meta automatically gives you a free Test Phone Number with 5 free test recipients so you can verify template broadcasting immediately before adding your real phone number!
                </span>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {activeTab === 2 && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                <h4 className="font-bold text-sm">Step 2: Generate Permanent Token, Phone Number ID & WABA ID</h4>
                <p className="text-xs">
                  A permanent System User Token never expires, ensuring your broadcast platform runs continuously 24/7.
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">A. How to Get Phone Number ID & WABA ID:</h5>
                <ol className="space-y-2 list-decimal list-inside bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <li>In your Meta Developer App, go to <strong>WhatsApp &gt; API Setup</strong>.</li>
                  <li>Under <em>&ldquo;Send and receive messages&rdquo;</em>, locate and copy:
                    <ul className="list-disc list-inside pl-4 pt-1 space-y-1 font-mono text-[11px] text-slate-800">
                      <li><strong>Phone number ID</strong> (e.g., <code>100654321987654</code>)</li>
                      <li><strong>WhatsApp Business Account ID</strong> (e.g., <code>100987654321098</code>)</li>
                    </ul>
                  </li>
                  <li>Paste both IDs into your platform&apos;s <strong>Settings (/settings)</strong>.</li>
                </ol>

                <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider pt-2">B. How to Create a Permanent System User Token:</h5>
                <ol className="space-y-2 list-decimal list-inside bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <li>Open <a href="https://business.facebook.com/settings" target="_blank" rel="noreferrer" className="text-emerald-700 underline inline-flex items-center gap-1">Meta Business Settings <ExternalLink className="w-3 h-3" /></a>.</li>
                  <li>In the left menu under <strong>Users</strong>, click <strong>System Users</strong> &gt; click <strong>&ldquo;Add&rdquo;</strong>.</li>
                  <li>Name it <code>WhatsApp Cloud Admin</code> and select Role: <strong>Admin</strong>.</li>
                  <li>Click <strong>&ldquo;Add Assets&rdquo;</strong> &gt; select <strong>Apps</strong> &gt; choose your WhatsApp App &gt; toggle <strong>Full Control (Manage App)</strong> &gt; Save.</li>
                  <li>Click <strong>&ldquo;Generate New Token&rdquo;</strong> &gt; select your App &gt; choose Token expiration: <strong>Never</strong>.</li>
                  <li>Check the following two permissions:
                    <ul className="list-disc list-inside pl-4 pt-1 space-y-1 font-mono text-[11px] text-emerald-800 font-bold">
                      <li><code>whatsapp_business_messaging</code></li>
                      <li><code>whatsapp_business_management</code></li>
                    </ul>
                  </li>
                  <li>Click <strong>Generate Token</strong>, copy the token string, and paste it into your <strong>Settings (/settings)</strong>.</li>
                </ol>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {activeTab === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                <h4 className="font-bold text-sm">Step 3: Connect Webhooks for Real-Time Blue Ticks & Replies</h4>
                <p className="text-xs">
                  Webhooks notify your platform immediately when a recipient receives (double grey ticks), reads (double blue ticks), or replies to your messages.
                </p>
              </div>

              <ol className="space-y-3 list-decimal list-inside bg-slate-50 p-4 rounded-xl border border-slate-200">
                <li>In Meta Developer Portal, navigate to <strong>WhatsApp &gt; Configuration</strong>.</li>
                <li>Under <strong>Webhook</strong>, click <strong>&ldquo;Edit&rdquo;</strong>.</li>
                <li>Enter your Callback URL:
                  <div className="my-1.5 p-2 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] flex items-center justify-between">
                    <span>https://your-domain.com/api/webhooks/whatsapp</span>
                  </div>
                </li>
                <li>Enter the <strong>Verify Token</strong> (found on your <code>/settings</code> page).</li>
                <li>Click <strong>Verify and Save</strong>. Meta will perform an instant handshake.</li>
                <li>Click <strong>&ldquo;Manage Webhook fields&rdquo;</strong> and subscribe to:
                  <ul className="list-disc list-inside pl-4 pt-1 space-y-1 font-mono text-[11px] text-slate-800">
                    <li><strong className="text-emerald-700">messages</strong> (Ingests delivery status changes and inbound customer chat replies)</li>
                    <li><strong className="text-emerald-700">message_template_status_update</strong> (Notifies you when Meta approves new templates)</li>
                  </ul>
                </li>
              </ol>
            </div>
          )}

          {/* STEP 4 */}
          {activeTab === 4 && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                <h4 className="font-bold text-sm">Step 4: Add Payment Method & Verify Your Real Business Phone Number</h4>
                <p className="text-xs">
                  To send messages to real customers at scale, attach a payment method to your Meta WhatsApp Business Account.
                </p>
              </div>

              <ol className="space-y-3 list-decimal list-inside bg-slate-50 p-4 rounded-xl border border-slate-200">
                <li>Go to <a href="https://business.facebook.com/billing_hub" target="_blank" rel="noreferrer" className="text-emerald-700 underline inline-flex items-center gap-1">Meta Business Billing Hub <ExternalLink className="w-3 h-3" /></a> and add a credit card / payment method to your WhatsApp Business Account.</li>
                <li>In Meta Developer Portal &gt; <strong>WhatsApp &gt; API Setup</strong>, scroll down to <strong>&ldquo;Step 5: Add a phone number&rdquo;</strong>.</li>
                <li>Enter your business display name, category, and phone number.</li>
                <li>Verify your number via SMS or Voice Call OTP.</li>
                <li>Once verified, copy the new <strong>Phone number ID</strong> into your platform&apos;s <strong>Settings (/settings)</strong>.</li>
              </ol>
            </div>
          )}

          {/* STEP 5 */}
          {activeTab === 5 && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                <h4 className="font-bold text-sm">Step 5: Scaling Messaging Tiers & Protecting Quality Rating</h4>
                <p className="text-xs">
                  Meta assigns daily messaging limits that automatically scale based on customer engagement.
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Tier 1</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">1,000</p>
                    <span className="text-[10px] text-slate-400">unique users/day</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Tier 2</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">10,000</p>
                    <span className="text-[10px] text-slate-400">unique users/day</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Tier 3</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">100,000</p>
                    <span className="text-[10px] text-slate-400">unique users/day</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Tier 4</span>
                    <p className="text-sm font-bold text-emerald-700 mt-0.5">Unlimited</p>
                    <span className="text-[10px] text-slate-400">unlimited volume</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h5 className="font-bold text-slate-900">How to Maintain a GREEN Quality Rating:</h5>
                  <ul className="list-disc list-inside space-y-1 text-[11.5px] text-slate-600">
                    <li>Only broadcast to customers who have opted in to receive messages from your brand.</li>
                    <li>Always include clear footer unsubscribe copy (e.g. <em>&ldquo;Reply STOP to opt out&rdquo;</em>).</li>
                    <li>Use our platform&apos;s built-in <strong>Rate Limiter</strong> (20 msgs/sec) to avoid burst spam flagging.</li>
                    <li>Meta will automatically upgrade your Tier from 1K $\rightarrow$ 10K $\rightarrow$ 100K when your sent volume reaches 50% of your daily tier limit with a Green quality rating over 7 days!</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            onClick={() => setActiveTab((prev) => Math.max(1, prev - 1))}
            disabled={activeTab === 1}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 disabled:opacity-40"
          >
            Previous Step
          </button>

          <div className="flex items-center gap-2">
            {activeTab < 5 ? (
              <button
                onClick={() => setActiveTab((prev) => Math.min(5, prev + 1))}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
              >
                Ready & Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
