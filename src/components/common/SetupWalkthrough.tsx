'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, X, Sparkles } from 'lucide-react';

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
    <div className="overflow-hidden rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-full bg-brand-subtle text-brand-subtle-foreground">
            <Sparkles className="size-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">Getting started checklist</h3>
            <p className="text-2xs text-muted-foreground">
              {completedCount} of {steps.length} setup steps completed
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsDismissed(true)}
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 pt-3 sm:grid-cols-3 lg:grid-cols-5">
        {steps.map((step) => (
          <Link
            key={step.id}
            href={step.href}
            className={`flex flex-col justify-between rounded-lg border p-3 transition-all active:scale-[0.98] ${
              step.done
                ? 'border-border bg-muted/40 text-muted-foreground'
                : 'border-border bg-muted/70 text-foreground hover:border-primary/50'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-2xs text-muted-foreground">Step 0{step.id}</span>
                {step.done ? (
                  <CheckCircle2 className="size-3.5 text-primary" />
                ) : (
                  <Circle className="size-3.5 text-muted-foreground" />
                )}
              </div>
              <h4 className={`text-xs font-semibold ${step.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {step.title}
              </h4>
            </div>
            <span className="mt-2 line-clamp-1 block text-2xs text-muted-foreground">{step.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
