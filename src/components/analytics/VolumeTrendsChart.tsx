'use client';

import React from 'react';
import { InfoTooltip, Tooltip } from '@/components/ui/Tooltip';

interface VolumeTrendsProps {
  data: Array<{
    date: string;
    sent: number;
    delivered: number;
    read: number;
    replied: number;
  }>;
}

const SERIES = [
  { key: 'sent', label: 'Sent', cls: 'bg-chart-2', hint: 'Messages accepted by Meta Cloud API' },
  { key: 'delivered', label: 'Delivered', cls: 'bg-chart-1', hint: 'Double grey ticks (delivered to phone)' },
  { key: 'read', label: 'Read', cls: 'bg-chart-6', hint: 'Double blue ticks (viewed by user)' },
  { key: 'replied', label: 'Replied', cls: 'bg-chart-4', hint: 'Inbound chat reply from customer' },
] as const;

export function VolumeTrendsChart({ data = [] }: VolumeTrendsProps) {
  const maxVal = Math.max(...data.map((d) => d.sent || 0), 10);

  return (
    <div className="space-y-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-foreground">Activity trends</h3>
            <InfoTooltip content="Daily volume across Sent, Delivered, Read and Replied message states." />
          </div>
          <p className="text-[0.6875rem] text-muted-foreground">Daily message dispatch and response breakdown</p>
        </div>

        <div className="flex items-center gap-2.5 text-[0.625rem] font-semibold text-muted-foreground">
          {SERIES.map((s) => (
            <Tooltip key={s.key} content={s.hint}>
              <span className="flex cursor-help items-center gap-1">
                <span className={`size-2 rounded-full ${s.cls}`} />
                <span>{s.label}</span>
              </span>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="flex h-44 items-end justify-between gap-2 border-b border-border pb-2">
        {data.map((day) => (
          <div key={day.date} className="group flex flex-1 flex-col items-center gap-1">
            <div className="flex h-32 w-full items-end justify-center gap-0.5">
              {SERIES.map((s) => {
                const val = (day[s.key] as number) || 0;
                const h = Math.round((val / maxVal) * 100);
                return (
                  <div
                    key={s.key}
                    title={`${s.label}: ${val}`}
                    className={`w-1/4 rounded-t-sm transition-all duration-300 ${s.cls}`}
                    style={{ height: `${Math.max(4, h)}%` }}
                  />
                );
              })}
            </div>
            <span className="text-[0.625rem] font-medium text-muted-foreground group-hover:text-foreground">
              {day.date}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
