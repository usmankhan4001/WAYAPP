'use client';

import React from 'react';
import { Send, CheckCheck, Eye, MessageSquare, ArrowDown } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/Tooltip';

interface FunnelStep {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface ConversionFunnelProps {
  funnel: FunnelStep[];
}

export function ConversionFunnelChart({ funnel = [] }: ConversionFunnelProps) {
  const tooltips: Record<string, string> = {
    Targeted: 'Total valid contact phone numbers selected for broadcast.',
    Sent: 'Messages successfully dispatched and accepted by Meta Cloud API.',
    Delivered: 'Messages successfully delivered to the recipient phone (double grey ticks).',
    'Opened / Read': 'Messages opened and read by the user in WhatsApp (double blue ticks).',
    Replied: 'Inbound customer replies received within the 24-hour service conversation window.',
  };

  const icons: Record<string, any> = {
    Targeted: Send,
    Sent: Send,
    Delivered: CheckCheck,
    'Opened / Read': Eye,
    Replied: MessageSquare,
  };

  const hasData = funnel.some((f) => f.count > 0);

  return (
    <div className="space-y-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-foreground">Message conversion funnel</h3>
            <InfoTooltip content="Recipient progression from broadcast dispatch to open rates and customer replies." />
          </div>
          <p className="text-2xs text-muted-foreground">Live webhook status state transitions</p>
        </div>
        <span className="rounded bg-muted px-2 py-0.5 text-2xs font-semibold text-muted-foreground">
          Webhook synced
        </span>
      </div>

      {!hasData ? (
        <div className="space-y-1 py-12 text-center text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">No telemetry data recorded yet</p>
          <p className="text-2xs">Launch a broadcast campaign to view real-time delivery and read rates.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {funnel.map((step, idx) => {
            const Icon = icons[step.name] || CheckCheck;
            const isLast = idx === funnel.length - 1;

            return (
              <div key={step.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <span
                      className="flex size-5 shrink-0 items-center justify-center rounded-md text-white"
                      style={{ backgroundColor: step.color }}
                    >
                      <Icon className="size-3" />
                    </span>
                    <div className="flex items-center gap-1">
                      <span>{step.name}</span>
                      {tooltips[step.name] && <InfoTooltip content={tooltips[step.name]} size="xs" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-foreground">{step.count.toLocaleString()}</span>
                    <span className="w-10 text-right text-2xs text-muted-foreground">
                      {step.percentage}%
                    </span>
                  </div>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(2, step.percentage)}%`,
                      backgroundColor: step.color,
                    }}
                  />
                </div>

                {!isLast && (
                  <div className="flex justify-center py-0.5">
                    <ArrowDown className="size-2.5 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
