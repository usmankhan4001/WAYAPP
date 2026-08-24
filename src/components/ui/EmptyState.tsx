import React from 'react';
import { Inbox, BarChart3, Users, Send, Search, FileText, Bot } from 'lucide-react';
import { clsx } from 'clsx';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  variant?: 'default' | 'compact';
  className?: string;
}

/**
 * Standardized empty state component for zero-data scenarios.
 * Shows an icon, title, description, and optional CTA button.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  variant = 'default',
  className,
}: EmptyStateProps) {
  const isCompact = variant === 'compact';

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        isCompact ? 'py-8 px-4' : 'py-16 px-8',
        className
      )}
    >
      <div
        className={clsx(
          'rounded-2xl bg-slate-50 flex items-center justify-center mb-4',
          isCompact ? 'w-10 h-10' : 'w-14 h-14'
        )}
      >
        <Icon className={clsx('text-slate-400', isCompact ? 'w-5 h-5' : 'w-7 h-7')} />
      </div>

      <h3
        className={clsx(
          'font-bold text-slate-800',
          isCompact ? 'text-xs' : 'text-sm'
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={clsx(
            'text-slate-400 mt-1 max-w-xs',
            isCompact ? 'text-[10px]' : 'text-xs'
          )}
        >
          {description}
        </p>
      )}

      {(actionLabel && (onAction || actionHref)) && (
        <>
          {actionHref ? (
            <a
              href={actionHref}
              className={clsx(
                'mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition-all',
                isCompact ? 'text-[10px] px-3 py-1.5' : 'text-xs'
              )}
            >
              {actionLabel}
            </a>
          ) : (
            <button
              onClick={onAction}
              className={clsx(
                'mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition-all',
                isCompact ? 'text-[10px] px-3 py-1.5' : 'text-xs'
              )}
            >
              {actionLabel}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// Pre-configured empty states for common scenarios
export function EmptyInbox() {
  return (
    <EmptyState
      icon={Inbox}
      title="No conversations yet"
      description="When customers message your WhatsApp number, conversations will appear here."
    />
  );
}

export function EmptyAnalytics() {
  return (
    <EmptyState
      icon={BarChart3}
      title="No analytics data"
      description="Send your first campaign to see delivery, read, and reply analytics here."
      actionLabel="Create Campaign"
      actionHref="/campaigns"
    />
  );
}

export function EmptyContacts() {
  return (
    <EmptyState
      icon={Users}
      title="No contacts imported"
      description="Import contacts via CSV or they'll be added automatically when customers message you."
      actionLabel="Import Contacts"
      actionHref="/contacts"
    />
  );
}

export function EmptyCampaigns() {
  return (
    <EmptyState
      icon={Send}
      title="No campaigns created"
      description="Create your first broadcast campaign to reach customers with approved templates."
      actionLabel="New Campaign"
      actionHref="/campaigns"
    />
  );
}

export function EmptyTemplates() {
  return (
    <EmptyState
      icon={FileText}
      title="No templates synced"
      description="Sync your Meta-approved WhatsApp message templates to start sending campaigns."
      actionLabel="Sync Templates"
      actionHref="/templates"
    />
  );
}

export function EmptySearchResults() {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description="Try adjusting your search query or filters."
      variant="compact"
    />
  );
}
