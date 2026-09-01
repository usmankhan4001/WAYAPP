'use client';

/**
 * /design — living documentation for the WAYAPP design system.
 * Every primitive rendered in light + dark. Dev-facing; bypasses the app shell.
 * Pair with docs/DESIGN_SYSTEM.md.
 */

import React, { useState } from 'react';
import { Send, Search, Trash2, Plus, Sparkles } from 'lucide-react';

import { useTheme, ThemeToggle } from '@/components/providers/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { useConfirm } from '@/lib/hooks/use-confirm';
import { PageHeader } from '@/components/ui/page-header';
import { FilterTabs, SegmentedControl } from '@/components/ui/filter-tabs';
import { Stat, StatGrid } from '@/components/ui/stat';
import { Tooltip, InfoTooltip } from '@/components/ui/Tooltip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="flex flex-wrap items-start gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">{children}</div>
    </section>
  );
}

const SWATCHES = [
  'background', 'foreground', 'card', 'popover', 'primary', 'secondary', 'muted', 'accent',
  'destructive', 'border', 'input', 'ring', 'brand', 'brand-subtle', 'wa', 'wa-bubble-out',
  'chat-canvas', 'success', 'warning', 'info', 'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5',
];

export default function DesignSystemPage() {
  const { resolvedTheme } = useTheme();
  const confirm = useConfirm();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [seg, setSeg] = useState('a');

  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-8 text-sm text-muted-foreground">
        The /design gallery is available in development only.
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background p-6 text-foreground md:p-10">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">WAYAPP design system</h1>
            <p className="text-sm text-muted-foreground">
              Resolved theme: <span className="font-mono">{resolvedTheme ?? 'system'}</span>
            </p>
          </div>
          <ThemeToggle />
        </div>

        <Section title="Tokens">
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {SWATCHES.map((name) => (
              <div key={name} className="space-y-1">
                <div
                  className="h-12 w-full rounded-lg ring-1 ring-foreground/10"
                  style={{ background: `var(--${name})` }}
                />
                <p className="truncate font-mono text-2xs text-muted-foreground">{name}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Buttons">
          {(['default', 'wa', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const).map((v) => (
            <Button key={v} variant={v}>
              {v}
            </Button>
          ))}
          <Button size="sm">sm</Button>
          <Button size="lg">lg</Button>
          <Button size="icon" aria-label="icon">
            <Plus />
          </Button>
          <Button disabled>disabled</Button>
          <Button>
            <Send />
            with icon
          </Button>
        </Section>

        <Section title="Badges">
          {(['default', 'secondary', 'outline', 'destructive', 'brand', 'success', 'warning', 'info', 'accent'] as const).map((v) => (
            <Badge key={v} variant={v}>
              {v}
            </Badge>
          ))}
          {(['brand', 'success', 'warning', 'info', 'destructive', 'accent'] as const).map((t) => (
            <StatusBadge key={t} tone={t}>
              tone: {t}
            </StatusBadge>
          ))}
        </Section>

        <Section title="Inputs">
          <Input placeholder="Text input" className="w-56" />
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="With icon" className="w-full pl-8" />
          </div>
          <Input placeholder="Disabled" disabled className="w-40" />
        </Section>

        <Section title="Filter tabs / segmented control">
          <FilterTabs
            options={[
              { value: 'all', label: 'All', count: 12 },
              { value: 'open', label: 'Open', count: 3 },
              { value: 'done', label: 'Done' },
            ]}
            value={filter}
            onValueChange={setFilter}
          />
          <SegmentedControl
            options={[
              { value: 'a', label: 'Table' },
              { value: 'b', label: 'Kanban' },
            ]}
            value={seg}
            onValueChange={setSeg}
          />
        </Section>

        <Section title="Stats">
          <StatGrid className="w-full">
            <Stat label="Targeted" value="12,480" hint="18 campaigns" icon={<Send />} />
            <Stat label="Delivery rate" value="97%" hint="12,105 delivered" delta="+2%" deltaTone="up" />
            <Stat label="Read rate" value="71%" hint="8,594 read" />
            <Stat label="Failed" value="1.2%" hint="149 errors" deltaTone="down" />
          </StatGrid>
        </Section>

        <Section title="Card">
          <Card className="w-72">
            <CardHeader>
              <CardTitle>Card title</CardTitle>
              <CardDescription>A description line for the card.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Body content sits here.</CardContent>
          </Card>
        </Section>

        <Section title="Overlays & feedback">
          <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
          <Button
            variant="destructive"
            onClick={async () => {
              const ok = await confirm({ title: 'Delete this item?', destructive: true, confirmLabel: 'Delete' });
              toast[ok ? 'success' : 'info'](ok ? 'Confirmed' : 'Cancelled');
            }}
          >
            useConfirm()
          </Button>
          <Button variant="outline" onClick={() => toast.success('Saved', 'Everything went through.')}>
            toast.success
          </Button>
          <Button variant="outline" onClick={() => toast.error('Failed', 'Something went wrong.')}>
            toast.error
          </Button>
          <Tooltip content="A helpful tooltip">
            <Button variant="ghost">Hover me</Button>
          </Tooltip>
          <span className="inline-flex items-center gap-1 text-sm">
            Label <InfoTooltip content="Explains the label" />
          </span>
        </Section>

        <Section title="Empty & loading">
          <div className="w-full max-w-sm">
            <EmptyState icon={Sparkles} title="Nothing here yet" description="Create your first item to get started." actionLabel="Create" onAction={() => {}} />
          </div>
          <div className="w-64 space-y-2">
            <Skeleton lines={3} />
            <SkeletonCard />
          </div>
        </Section>

        <Section title="PageHeader">
          <div className="w-full">
            <PageHeader
              title="Broadcast campaigns"
              description="Launch, schedule and track rate-limited broadcasts."
              icon={<Send />}
              actions={
                <Button variant="wa" size="sm">
                  <Plus />
                  New broadcast
                </Button>
              }
            />
          </div>
        </Section>
      </div>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Example modal"
        description="Centered Dialog on desktop, bottom Drawer on mobile."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setModalOpen(false)}>
              <Trash2 />
              Confirm
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Resize the window below 768px and reopen — it becomes a swipe-dismissable bottom sheet.
        </p>
      </Modal>
    </div>
  );
}
