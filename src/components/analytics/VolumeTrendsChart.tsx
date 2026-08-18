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

export function VolumeTrendsChart({ data = [] }: VolumeTrendsProps) {
  const maxVal = Math.max(...data.map((d) => d.sent || 0), 10);

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-slate-900">7-Day Activity Trends</h3>
            <InfoTooltip content="Shows daily volume distribution across Sent, Delivered, Read, and Replied message states." />
          </div>
          <p className="text-[11px] text-slate-500">Daily message dispatch and response breakdown</p>
        </div>

        <div className="flex items-center gap-2.5 text-[10px] font-semibold text-slate-600">
          <Tooltip content="Messages accepted by Meta Cloud API">
            <span className="flex items-center gap-1 cursor-help">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Sent</span>
            </span>
          </Tooltip>
          <Tooltip content="Double grey ticks (delivered to phone)">
            <span className="flex items-center gap-1 cursor-help">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Delivered</span>
            </span>
          </Tooltip>
          <Tooltip content="Double blue ticks (viewed by user)">
            <span className="flex items-center gap-1 cursor-help">
              <span className="w-2 h-2 rounded-full bg-[#0ea5e9]" />
              <span>Read</span>
            </span>
          </Tooltip>
          <Tooltip content="Inbound chat reply received from customer">
            <span className="flex items-center gap-1 cursor-help">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span>Replied</span>
            </span>
          </Tooltip>
        </div>
      </div>

      {/* Bar Chart Visualization */}
      <div className="h-44 flex items-end justify-between gap-2 border-b border-slate-100 pb-2">
        {data.map((day) => {
          const sentHeight = Math.round((day.sent / maxVal) * 100);
          const deliveredHeight = Math.round((day.delivered / maxVal) * 100);
          const readHeight = Math.round((day.read / maxVal) * 100);
          const repliedHeight = Math.round((day.replied / maxVal) * 100);

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="w-full flex items-end justify-center gap-0.5 h-32">
                <div
                  title={`Sent: ${day.sent}`}
                  className="w-1/4 bg-blue-500 rounded-t-sm transition-all duration-300"
                  style={{ height: `${Math.max(4, sentHeight)}%` }}
                />
                <div
                  title={`Delivered: ${day.delivered}`}
                  className="w-1/4 bg-emerald-500 rounded-t-sm transition-all duration-300"
                  style={{ height: `${Math.max(4, deliveredHeight)}%` }}
                />
                <div
                  title={`Read: ${day.read}`}
                  className="w-1/4 bg-[#0ea5e9] rounded-t-sm transition-all duration-300"
                  style={{ height: `${Math.max(4, readHeight)}%` }}
                />
                <div
                  title={`Replied: ${day.replied}`}
                  className="w-1/4 bg-purple-500 rounded-t-sm transition-all duration-300"
                  style={{ height: `${Math.max(4, repliedHeight)}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-slate-500 group-hover:text-slate-900">{day.date}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
