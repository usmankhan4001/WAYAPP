'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { useSettings } from '@/components/providers/SessionProvider';

interface SetupWalkthroughProps {
  hasContacts?: boolean;
  hasCampaigns?: boolean;
}

const DISMISS_KEY = 'wayapp.firstRunChecklist.dismissed';

/** Three plain steps for a brand-new account. Step 1 is done once WhatsApp is connected. */
export function SetupWalkthrough({ hasContacts = false, hasCampaigns = false }: SetupWalkthroughProps) {
  const { settings } = useSettings();
  const [isDismissed, setIsDismissed] = useState(true); // hidden until we know, avoids a flash

  useEffect(() => {
    try {
      setIsDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setIsDismissed(false);
    }
  }, []);

  const steps = [
    {
      id: 1,
      title: 'Connect your WhatsApp number',
      desc: 'Link the number you want to send messages from.',
      href: '/settings',
      done: Boolean(settings?.isConnected),
    },
    {
      id: 2,
      title: 'Add your contacts',
      desc: 'Upload a list or add people one by one.',
      href: '/contacts',
      done: hasContacts,
    },
    {
      id: 3,
      title: 'Send your first message',
      desc: 'Pick a message and send it to your contacts.',
      href: '/campaigns/new',
      done: hasCampaigns,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  if (isDismissed || completed === steps.length) return null;

  const dismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {}
  };

  return (
    <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Get started in 3 steps</h2>
          <p className="text-sm text-muted-foreground">{completed} of {steps.length} done</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Hide this checklist"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
        >
          <X className="size-4" />
        </button>
      </div>

      <ol className="mt-4 grid gap-3 md:grid-cols-3">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className="flex h-full items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
            >
              {step.done ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
              ) : (
                <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              )}
              <span>
                <span className={`block text-sm font-medium ${step.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {step.id}. {step.title}
                </span>
                <span className="block text-sm text-muted-foreground">{step.desc}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
