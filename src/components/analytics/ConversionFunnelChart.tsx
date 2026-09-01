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
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-slate-900">Message Conversion Funnel</h3>
            <InfoTooltip content="Visualizes recipient progression from initial broadcast dispatch to open rates and customer replies." />
          </div>
          <p className="text-[11px] text-slate-500">Live webhook status state transitions</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200">
          Webhook Synced
        </span>
      </div>

      {!hasData ? (
        <div className="py-12 text-center text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-600">No telemetry data recorded yet</p>
          <p className="text-[11px]">Launch a broadcast campaign to view real-time delivery and read rates.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {funnel.map((step, idx) => {
            const Icon = icons[step.name] || CheckCheck;
            const isLast = idx === funnel.length - 1;

            return (
              <div key={step.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <span
                      className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: step.color }}
                    >
                      <Icon className="w-3 h-3" />
                    </span>
                    <div className="flex items-center gap-1">
                      <span>{step.name}</span>
                      {tooltips[step.name] && <InfoTooltip content={tooltips[step.name]} size="xs" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-slate-900">{step.count.toLocaleString()}</span>
                    <span className="text-[11px] text-slate-500 w-10 text-right">
                      {step.percentage}%
                    </span>
                  </div>
                </div>

                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
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
                    <ArrowDown className="w-2.5 h-2.5 text-slate-300" />
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
