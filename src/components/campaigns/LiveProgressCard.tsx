'use client';

import React from 'react';
import { Play, Pause, XCircle, Send, CheckCheck, Eye, MessageSquare, AlertCircle } from 'lucide-react';

interface LiveProgressCardProps {
  campaign: any;
  stats: any;
  onAction: (action: 'START' | 'PAUSE' | 'RESUME' | 'CANCEL') => void;
}

export function LiveProgressCard({ campaign, stats, onAction }: LiveProgressCardProps) {
  const isRunning = campaign.status === 'RUNNING' || campaign.status === 'QUEUED';
  const isPaused = campaign.status === 'PAUSED';
  const isCompleted = campaign.status === 'COMPLETED';

  const progressPercentage = campaign.totalContacts > 0
    ? Math.min(100, Math.round(((campaign.sentCount + campaign.failedCount) / campaign.totalContacts) * 100))
    : 0;

  return (
    <div className="card-base p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={
                isCompleted
                  ? 'badge-emerald'
                  : isRunning
                  ? 'badge-sky'
                  : isPaused
                  ? 'badge-amber'
                  : 'badge-slate'
              }
            >
              {campaign.status}
            </span>
            <span className="text-[11px] text-slate-500">
              Created {new Date(campaign.createdAt).toLocaleDateString()}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mt-1">{campaign.name}</h2>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isRunning && (
            <button
              onClick={() => onAction('PAUSE')}
              className="btn-secondary h-8 px-3 text-xs text-amber-700"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          )}

          {isPaused && (
            <button
              onClick={() => onAction('RESUME')}
              className="btn-primary h-8 px-3 text-xs"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume</span>
            </button>
          )}

          {!isCompleted && campaign.status !== 'CANCELLED' && (
            <button
              onClick={() => onAction('CANCEL')}
              className="btn-secondary h-8 px-3 text-xs text-rose-700"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-slate-600">
          <span>
            Dispatched {campaign.sentCount + campaign.failedCount} of {campaign.totalContacts} contacts
          </span>
          <span className="font-mono font-semibold text-slate-900">{progressPercentage}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-center">
          <span className="text-[11px] text-slate-500 font-medium block mb-0.5">Sent</span>
          <p className="text-base font-semibold text-slate-900 font-mono">{campaign.sentCount}</p>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-center">
          <span className="text-[11px] text-slate-500 font-medium block mb-0.5">
            Delivered ({stats.deliveryRate}%)
          </span>
          <p className="text-base font-semibold text-emerald-700 font-mono">{campaign.deliveredCount}</p>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-center">
          <span className="text-[11px] text-slate-500 font-medium block mb-0.5">
            Read ({stats.readRate}%)
          </span>
          <p className="text-base font-semibold text-sky-700 font-mono">{campaign.readCount}</p>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-center">
          <span className="text-[11px] text-slate-500 font-medium block mb-0.5">
            Replies ({stats.replyRate}%)
          </span>
          <p className="text-base font-semibold text-violet-700 font-mono">{campaign.repliedCount}</p>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-center">
          <span className="text-[11px] text-slate-500 font-medium block mb-0.5">
            Failed ({stats.failureRate}%)
          </span>
          <p className="text-base font-semibold text-rose-600 font-mono">{campaign.failedCount}</p>
        </div>
      </div>
    </div>
  );
}
