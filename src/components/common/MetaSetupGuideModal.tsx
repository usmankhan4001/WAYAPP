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
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MetaSetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MetaSetupGuideModal({ isOpen, onClose }: MetaSetupGuideModalProps) {
  const [activeTab, setActiveTab] = useState<number>(1);
  const [copiedToken, setCopiedToken] = useState(false);


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
    <Modal
      open={isOpen}
      onOpenChange={(o) => !o && onClose()}
      size="xl"
      contentClassName="max-h-[70vh]"
      title={
        <span className="inline-flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-wa text-wa-foreground">
            <BookOpen className="size-4" />
          </span>
          Meta WhatsApp Cloud API setup guide
        </span>
      }
      description="Connect your official WhatsApp Business number and go live"
      footer={
        <div className="flex w-full items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setActiveTab((prev) => Math.max(1, prev - 1))}
            disabled={activeTab === 1}
          >
            Previous
          </Button>
          {activeTab < 5 ? (
            <Button variant="wa" onClick={() => setActiveTab((prev) => Math.min(5, prev + 1))}>
              Next step
            </Button>
          ) : (
            <Button variant="wa" onClick={onClose}>
              Ready &amp; done
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6 text-xs leading-relaxed text-foreground">
        {/* Stepper */}
        <div className="-mx-4 flex overflow-x-auto border-b border-border px-4">
          {steps.map((s) => {
            const isSelected = activeTab === s.num;
            return (
              <button
                key={s.num}
                onClick={() => setActiveTab(s.num)}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-3 text-xs font-medium transition-colors',
                  isSelected ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex size-5 items-center justify-center rounded-full text-2xs',
                    isSelected ? 'bg-wa text-wa-foreground' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {s.num}
                </span>
                <span>{s.title}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-6">
          {/* STEP 1 */}
          {activeTab === 1 && (
            <div className="space-y-4">
              <div className="p-4 bg-black/5 rounded-xl border border-transparent text-brand-subtle-foreground space-y-1">
                <h4 className="font-normal text-sm">Step 1: Create a Meta Developer Account & WhatsApp App</h4>
                <p className="text-xs">
                  To send official WhatsApp templates, you need an application in the Meta for Developers portal.
                </p>
              </div>

              <ol className="space-y-3 list-decimal list-inside bg-black/5 p-4 rounded-xl border border-border">
                <li className="font-normal text-foreground">
                  Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-[#1c1e21] underline inline-flex items-center gap-1">Meta for Developers <ExternalLink className="w-3 h-3" /></a> and log in with your Facebook account.
                </li>
                <li>Click <strong>&ldquo;My Apps&rdquo;</strong> in the top-right corner, then click <strong>&ldquo;Create App&rdquo;</strong>.</li>
                <li>Select <strong>&ldquo;Other&rdquo;</strong> &gt; Next &gt; Select <strong>&ldquo;Business&rdquo;</strong> type.</li>
                <li>Enter your App Display Name and link your official <strong>Meta Business Account</strong>.</li>
                <li>On the App Dashboard, scroll to <strong>&ldquo;WhatsApp&rdquo;</strong> and click <strong>&ldquo;Set up&rdquo;</strong>.</li>
              </ol>

              <div className="p-3 bg-blue-50 rounded-full border border-blue-200 text-blue-900 flex items-start gap-2">
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
              <div className="p-4 bg-black/5 rounded-xl border border-transparent text-brand-subtle-foreground space-y-1">
                <h4 className="font-normal text-sm">Step 2: Generate Permanent Token, Phone Number ID & WABA ID</h4>
                <p className="text-xs">
                  A permanent System User Token never expires, ensuring your broadcast platform runs continuously 24/7.
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="font-normal text-foreground text-xs uppercase tracking-wider">A. How to Get Phone Number ID & WABA ID:</h5>
                <ol className="space-y-2 list-decimal list-inside bg-black/5 p-3.5 rounded-xl border border-border">
                  <li>In your Meta Developer App, go to <strong>WhatsApp &gt; API Setup</strong>.</li>
                  <li>Under <em>&ldquo;Send and receive messages&rdquo;</em>, locate and copy:
                    <ul className="list-disc list-inside pl-4 pt-1 space-y-1 font-mono text-2xs text-foreground">
                      <li><strong>Phone number ID</strong> (e.g., <code>100654321987654</code>)</li>
                      <li><strong>WhatsApp Business Account ID</strong> (e.g., <code>100987654321098</code>)</li>
                    </ul>
                  </li>
                  <li>Paste both IDs into your platform&apos;s <strong>Settings (/settings)</strong>.</li>
                </ol>

                <h5 className="font-normal text-foreground text-xs uppercase tracking-wider pt-2">B. How to Create a Permanent System User Token:</h5>
                <ol className="space-y-2 list-decimal list-inside bg-black/5 p-3.5 rounded-xl border border-border">
                  <li>Open <a href="https://business.facebook.com/settings" target="_blank" rel="noreferrer" className="text-[#1c1e21] underline inline-flex items-center gap-1">Meta Business Settings <ExternalLink className="w-3 h-3" /></a>.</li>
                  <li>In the left menu under <strong>Users</strong>, click <strong>System Users</strong> &gt; click <strong>&ldquo;Add&rdquo;</strong>.</li>
                  <li>Name it <code>WhatsApp Cloud Admin</code> and select Role: <strong>Admin</strong>.</li>
                  <li>Click <strong>&ldquo;Add Assets&rdquo;</strong> &gt; select <strong>Apps</strong> &gt; choose your WhatsApp App &gt; toggle <strong>Full Control (Manage App)</strong> &gt; Save.</li>
                  <li>Click <strong>&ldquo;Generate New Token&rdquo;</strong> &gt; select your App &gt; choose Token expiration: <strong>Never</strong>.</li>
                  <li>Check the following two permissions:
                    <ul className="list-disc list-inside pl-4 pt-1 space-y-1 font-mono text-2xs text-brand-subtle-foreground font-normal">
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
              <div className="p-4 bg-black/5 rounded-xl border border-transparent text-brand-subtle-foreground space-y-1">
                <h4 className="font-normal text-sm">Step 3: Connect Webhooks for Real-Time Blue Ticks & Replies</h4>
                <p className="text-xs">
                  Webhooks notify your platform immediately when a recipient receives (double grey ticks), reads (double blue ticks), or replies to your messages.
                </p>
              </div>

              <ol className="space-y-3 list-decimal list-inside bg-black/5 p-4 rounded-xl border border-border">
                <li>In Meta Developer Portal, navigate to <strong>WhatsApp &gt; Configuration</strong>.</li>
                <li>Under <strong>Webhook</strong>, click <strong>&ldquo;Edit&rdquo;</strong>.</li>
                <li>Enter your Callback URL:
                  <div className="my-1.5 p-2 bg-foreground text-background rounded-full font-mono text-2xs flex items-center justify-between">
                    <span>https://your-domain.com/api/webhooks/whatsapp</span>
                  </div>
                </li>
                <li>Enter the <strong>Verify Token</strong> (found on your <code>/settings</code> page).</li>
                <li>Click <strong>Verify and Save</strong>. Meta will perform an instant handshake.</li>
                <li>Click <strong>&ldquo;Manage Webhook fields&rdquo;</strong> and subscribe to:
                  <ul className="list-disc list-inside pl-4 pt-1 space-y-1 font-mono text-2xs text-foreground">
                    <li><strong className="text-[#1c1e21]">messages</strong> (Ingests delivery status changes and inbound customer chat replies)</li>
                    <li><strong className="text-[#1c1e21]">message_template_status_update</strong> (Notifies you when Meta approves new templates)</li>
                  </ul>
                </li>
              </ol>
            </div>
          )}

          {/* STEP 4 */}
          {activeTab === 4 && (
            <div className="space-y-4">
              <div className="p-4 bg-black/5 rounded-xl border border-transparent text-brand-subtle-foreground space-y-1">
                <h4 className="font-normal text-sm">Step 4: Add Payment Method & Verify Your Real Business Phone Number</h4>
                <p className="text-xs">
                  To send messages to real customers at scale, attach a payment method to your Meta WhatsApp Business Account.
                </p>
              </div>

              <ol className="space-y-3 list-decimal list-inside bg-black/5 p-4 rounded-xl border border-border">
                <li>Go to <a href="https://business.facebook.com/billing_hub" target="_blank" rel="noreferrer" className="text-[#1c1e21] underline inline-flex items-center gap-1">Meta Business Billing Hub <ExternalLink className="w-3 h-3" /></a> and add a credit card / payment method to your WhatsApp Business Account.</li>
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
              <div className="p-4 bg-black/5 rounded-xl border border-transparent text-brand-subtle-foreground space-y-1">
                <h4 className="font-normal text-sm">Step 5: Scaling Messaging Tiers & Protecting Quality Rating</h4>
                <p className="text-xs">
                  Meta assigns daily messaging limits that automatically scale based on customer engagement.
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-black/5 border border-border text-center">
                    <span className="text-2xs font-normal text-muted-foreground uppercase">Tier 1</span>
                    <p className="text-sm font-normal text-foreground mt-0.5">1,000</p>
                    <span className="text-2xs text-muted-foreground">unique users/day</span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/5 border border-border text-center">
                    <span className="text-2xs font-normal text-muted-foreground uppercase">Tier 2</span>
                    <p className="text-sm font-normal text-foreground mt-0.5">10,000</p>
                    <span className="text-2xs text-muted-foreground">unique users/day</span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/5 border border-border text-center">
                    <span className="text-2xs font-normal text-muted-foreground uppercase">Tier 3</span>
                    <p className="text-sm font-normal text-foreground mt-0.5">100,000</p>
                    <span className="text-2xs text-muted-foreground">unique users/day</span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/5 border border-border text-center">
                    <span className="text-2xs font-normal text-muted-foreground uppercase">Tier 4</span>
                    <p className="text-sm font-normal text-[#1c1e21] mt-0.5">Unlimited</p>
                    <span className="text-2xs text-muted-foreground">unlimited volume</span>
                  </div>
                </div>

                <div className="p-3.5 bg-black/5 rounded-xl border border-border space-y-2">
                  <h5 className="font-normal text-foreground">How to Maintain a GREEN Quality Rating:</h5>
                  <ul className="list-disc list-inside space-y-1 text-[11.5px] text-muted-foreground">
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

      </div>
    </Modal>
  );
}
