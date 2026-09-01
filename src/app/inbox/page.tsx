'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MessageSquare, Search, UserPlus, Sparkles, CheckCheck, ShieldCheck, AlertCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/utils';
import { ChatWindow } from '@/components/inbox/ChatWindow';
import { NewChatModal } from '@/components/inbox/NewChatModal';
import { SkeletonConversation } from '@/components/ui/Skeleton';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

function InboxContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlContactId = searchParams.get('contactId');

  const [conversations, setConversations] = useState<AnyRecord[]>([]);
  const [selectedContact, setSelectedContact] = useState<AnyRecord | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  const fetchConversations = useCallback(() => {
    const controller = new AbortController();
    const url = `/api/chat?filter=${filter}&limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}`;
    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.conversations || [];
        setConversations(list);
        if (
          list.length > 0 &&
          !selectedContact &&
          !urlContactId &&
          typeof window !== 'undefined' &&
          window.innerWidth >= 1024
        ) {
          setSelectedContact(list[0].contact || list[0]);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError('Failed to load conversations. Please check your connection.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [filter, search, selectedContact, urlContactId]);

  useEffect(() => {
    if (urlContactId) {
      fetch(`/api/contacts?search=`)
        .then((res) => res.json())
        .then((list) => {
          if (Array.isArray(list)) {
            const found = list.find((c) => c.id === urlContactId);
            if (found) setSelectedContact(found);
          }
        })
        .catch(() => {});
    } else if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSelectedContact(null);
    }
  }, [urlContactId]);

  useEffect(() => {
    const cancel = fetchConversations();
    const interval = setInterval(fetchConversations, 2500);
    return () => {
      cancel?.();
      clearInterval(interval);
    };
  }, [fetchConversations]);

  const handleSelect = (conv: AnyRecord) => {
    const contactObj = conv.contact || conv;
    router.push(`/inbox?contactId=${contactObj.id}`);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-muted text-foreground">
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onSelectContact={(contact) => {
          setSelectedContact(contact);
          fetchConversations();
        }}
      />

      {/* Conversation list */}
      <div
        className={cn(
          'flex h-full w-full shrink-0 flex-col border-r border-border bg-card lg:w-96 lg:min-w-[360px] lg:max-w-[400px]',
          selectedContact ? 'hidden lg:flex' : 'flex'
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border p-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-foreground">Chats</h2>
            {conversations.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-semibold text-muted-foreground">
                {conversations.length}
              </span>
            )}
          </div>
          <Button variant="wa" size="sm" onClick={() => setIsNewChatOpen(true)} title="Start a new WhatsApp chat">
            <UserPlus />
            <span>New chat</span>
          </Button>
        </div>

        <div className="shrink-0 space-y-2.5 border-b border-border p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search chats or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-xs"
            />
          </div>
          <FilterTabs
            size="sm"
            options={[
              { value: 'all', label: 'All' },
              { value: 'unread', label: <span className="inline-flex items-center gap-1"><Sparkles className="size-3" />Unread</span> },
            ]}
            value={filter}
            onValueChange={(v) => setFilter(v as 'all' | 'unread')}
          />
        </div>

        <div className="flex-1 divide-y divide-border overflow-y-auto">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonConversation key={i} />)
          ) : error ? (
            <div className="space-y-3 p-8 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="size-5" />
              </div>
              <p className="text-xs font-medium text-destructive">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  fetchConversations();
                }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="space-y-2 p-8 text-center text-xs text-muted-foreground">
              <MessageSquare className="mx-auto mb-1 size-8 text-muted-foreground/50" />
              <p className="font-semibold text-foreground">No chats found</p>
              <p className="text-[0.6875rem]">Start a new conversation or adjust your search filter.</p>
            </div>
          ) : (
            conversations.map((c) => {
              const contactObj = c.contact || c;
              const isSelected = selectedContact?.id === contactObj.id;
              const contactName = `${contactObj.firstName || ''} ${contactObj.lastName || ''}`.trim() || 'Customer';
              const lastMsg = c.messages?.[0] || contactObj.chatMessages?.[0];
              const isOutbound = lastMsg?.direction === 'OUTBOUND';
              return (
                <div
                  key={c.id || contactObj.id}
                  onClick={() => handleSelect(c)}
                  className={cn(
                    'flex cursor-pointer select-none items-start gap-3 p-3.5 transition-colors active:bg-accent',
                    isSelected ? 'border-l-4 border-primary bg-brand-subtle' : 'hover:bg-accent'
                  )}
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {contactName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center justify-between gap-1">
                      <span className="truncate text-xs font-semibold text-foreground">{contactName}</span>
                      <span className="shrink-0 font-mono text-[0.625rem] text-muted-foreground">
                        {c.lastMessageAt ? formatTimeAgo(new Date(c.lastMessageAt)) : ''}
                      </span>
                    </div>
                    <div className="mb-1 flex items-center gap-1 truncate text-[0.6875rem] text-muted-foreground">
                      {isOutbound && (
                        <CheckCheck
                          className={cn(
                            'size-3.5 shrink-0',
                            lastMsg?.status === 'READ'
                              ? 'text-info'
                              : lastMsg?.status === 'DELIVERED'
                              ? 'text-muted-foreground'
                              : 'text-muted-foreground/50'
                          )}
                        />
                      )}
                      <span className="truncate">{lastMsg?.body || 'Media attachment'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate font-mono text-[0.625rem] text-muted-foreground">{contactObj.phoneNumber}</span>
                      {c.unreadCount > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1.5 text-[0.625rem] font-bold text-primary-foreground">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat window */}
      <div className={cn('flex h-full min-w-0 flex-1 flex-col bg-chat-canvas', selectedContact ? 'flex' : 'hidden lg:flex')}>
        {selectedContact ? (
          <ChatWindow
            contact={selectedContact}
            onRefreshList={() => fetchConversations()}
            onBackMobile={() => router.push('/inbox')}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center space-y-4 bg-background p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-card text-primary ring-1 ring-foreground/10">
              <MessageSquare className="size-8" />
            </div>
            <div className="max-w-sm space-y-1">
              <h3 className="text-base font-semibold text-foreground">WAYAPP for web &amp; desktop</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Select a customer thread to begin live 1-to-1 WhatsApp chatting, send templates, or share media.
              </p>
            </div>
            <div className="flex items-center gap-1.5 pt-4 text-[0.6875rem] font-medium text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              <span>End-to-end Meta WhatsApp Cloud API connectivity</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center bg-muted">
          <div className="size-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
        </div>
      }
    >
      <InboxContent />
    </Suspense>
  );
}
