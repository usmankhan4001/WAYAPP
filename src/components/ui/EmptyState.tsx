import React from 'react';
import { Inbox, BarChart3, Users, Send, Search, FileText } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
      className={cn(
        'flex flex-col items-center justify-center text-center',
        isCompact ? 'px-4 py-8' : 'px-8 py-16',
        className
      )}
    >
      <div
        className={cn(
          'mb-4 flex items-center justify-center rounded-2xl bg-muted text-muted-foreground',
          isCompact ? 'size-10' : 'size-14'
        )}
      >
        <Icon className={isCompact ? 'size-5' : 'size-7'} />
      </div>

      <h3 className={cn('font-semibold text-foreground', isCompact ? 'text-xs' : 'text-sm')}>
        {title}
      </h3>

      {description && (
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
      )}

      {actionLabel && (onAction || actionHref) && (
        <Button
          size="sm"
          className="mt-4"
          render={actionHref ? <a href={actionHref} /> : undefined}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
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
