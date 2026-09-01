'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  ShieldCheck,
  Webhook,
  FileText,
  Users,
  Send,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface SetupWalkthroughProps {
  hasCredentials?: boolean;
  hasTemplates?: boolean;
  hasContacts?: boolean;
  hasCampaigns?: boolean;
}

export function SetupWalkthrough({
  hasCredentials = false,
  hasTemplates = false,
  hasContacts = false,
  hasCampaigns = false,
}: SetupWalkthroughProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const steps = [
    {
      id: 1,
      title: 'Meta API Credentials',
      desc: 'Add Phone Number ID, WABA ID & Permanent Token',
      href: '/settings',
      done: hasCredentials,
    },
    {
      id: 2,
      title: 'Webhook Verification',
      desc: 'Connect callback URL for live delivery status',
      href: '/settings',
      done: hasCredentials,
    },
    {
      id: 3,
      title: 'Message Templates',
      desc: 'Sync or create approved WhatsApp templates',
      href: '/templates',
      done: hasTemplates,
    },
    {
      id: 4,
      title: 'Audience & Groups',
      desc: 'Upload customer list and assign tags',
      href: '/contacts',
      done: hasContacts,
    },
    {
      id: 5,
      title: 'First Broadcast',
      desc: 'Send personalized template campaign',
      href: '/campaigns/new',
      done: hasCampaigns,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  if (isDismissed || completedCount === steps.length) return null;

  return (
    <div className="card-base p-4 bg-slate-900 text-slate-100 relative overflow-hidden">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/10 text-emerald-400 flex items-center justify-center font-normal text-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-normal text-white">Getting Started Checklist</h3>
            <p className="text-[11px] text-slate-400">
              {completedCount} of {steps.length} setup steps completed
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsDismissed(true)}
          className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Grid Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-3">
        {steps.map((step) => (
          <Link
            key={step.id}
            href={step.href}
            className={`p-3 rounded-xl border transition-all flex flex-col justify-between active:scale-[0.98] ${
              step.done
                ? 'bg-slate-800/40 border-slate-800/80 text-slate-400'
                : 'bg-slate-800/90 border-slate-700 hover:border-emerald-500/60 text-slate-200 shadow-2xs'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400">Step 0{step.id}</span>
                {step.done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-500" />
                )}
              </div>
              <h4 className={`text-xs font-semibold ${step.done ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                {step.title}
              </h4>
            </div>
            <span className="text-[10px] text-slate-400 mt-2 block line-clamp-1">{step.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
