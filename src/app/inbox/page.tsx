'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MessageSquare, Plus, AlertCircle, ShieldCheck } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ChatWindow } from '@/components/inbox/ChatWindow';
import { NewChatModal } from '@/components/inbox/NewChatModal';
import { ChatListRow, type RowAction } from '@/components/inbox/ChatListRow';
import { LIST_FILTERS } from '@/components/inbox/chat-utils';
import { useLiveRefresh, ReconnectingBanner } from '@/components/inbox/useLiveRefresh';
import { SkeletonConversation } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Chip } from '@/components/ui/chip';
import { SearchField } from '@/components/ui/search-field';
import { Button } from '@/components/ui/button';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

// Filters the dashboard links to, on top of the four chips. Unknown values fall back to All.
const EXTRA_FILTERS: { value: string; label: string }[] = [
  { value: 'closing', label: 'Closing soon' },
  { value: 'failed', label: 'Failed' },
];
const KNOWN_FILTERS: string[] = [...LIST_FILTERS.map((f) => f.value), ...EXTRA_FILTERS.map((f) => f.value)];
const TWO_PANE_MIN_WIDTH = 768;

function InboxContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const urlContactId = searchParams.get('contactId');
  const urlConversationId = searchParams.get('conversation');
  const urlFilter = searchParams.get('filter') || 'all';
  const wantsNewChat = searchParams.get('new') === '1';

  const [conversations, setConversations] = useState<AnyRecord[]>([]);
  const [selectedContact, setSelectedContact] = useState<AnyRecord | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>(KNOWN_FILTERS.includes(urlFilter) ? urlFilter : 'all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewChatOpen, setIsNewChatOpen] = useState(wantsNewChat);

  // Rejects on failure so useLiveRefresh can back off and show the "Reconnecting..." banner.
  const fetchConversations = useCallback(async () => {
    const url = `/api/chat?filter=${filter}&limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.conversations || [];
      setConversations(list);
      setError(null);
      if (
        list.length > 0 &&
        !selectedContact &&
        !urlContactId &&
        !urlConversationId &&
        typeof window !== 'undefined' &&
        window.innerWidth >= TWO_PANE_MIN_WIDTH
      ) {
        setSelectedContact(list[0].contact || list[0]);
      }
    } catch (err) {
      setError('Could not load your chats. Check your connection and try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [filter, search, selectedContact, urlContactId, urlConversationId]);

  const { offline } = useLiveRefresh(fetchConversations);

  // The dashboard links here with ?new=1.
  useEffect(() => {
    if (wantsNewChat) setIsNewChatOpen(true);
  }, [wantsNewChat]);

  const closeNewChat = () => {
    setIsNewChatOpen(false);
    if (wantsNewChat) router.replace('/inbox');
  };

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
    } else if (urlConversationId) {
      fetch(`/api/chat/conversations/${encodeURIComponent(urlConversationId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((conv) => {
          if (conv?.contact) setSelectedContact(conv.contact);
        })
        .catch(() => {});
    } else if (typeof window !== 'undefined' && window.innerWidth < TWO_PANE_MIN_WIDTH) {
      setSelectedContact(null);
    }
  }, [urlContactId, urlConversationId]);

  // Refetch straight away when the filter or search changes; the hook handles the rest.
  useEffect(() => {
    fetchConversations().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search]);

  const handleSelect = (conv: AnyRecord) => {
    const contactObj = conv.contact || conv;
    router.push(`/inbox?contactId=${contactObj.id}`);
  };

  const handleRowAction = async (conv: AnyRecord, action: RowAction) => {
    const body: AnyRecord =
      action === 'pin' ? { pinned: true }
      : action === 'unpin' ? { pinned: false }
      : action === 'archive' ? { archived: true }
      : action === 'unarchive' ? { archived: false }
      : { markUnread: true };
    try {
      const res = await fetch(`/api/chat/conversations/${encodeURIComponent(conv.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (action === 'archive') toast.success('Chat archived');
      await fetchConversations();
    } catch {
      toast.error('Could not update the chat', 'Try again in a moment.');
    }
  };

  const chips = [...LIST_FILTERS, ...EXTRA_FILTERS.filter((f) => f.value === filter)];

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-background text-foreground">
      <ReconnectingBanner show={offline} />
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={closeNewChat}
        onSelectContact={(contact) => {
          setSelectedContact(contact);
          fetchConversations();
        }}
      />

      {/* Chat list */}
      <div
        className={cn(
          'relative flex h-full w-full shrink-0 flex-col border-r border-border bg-background md:w-[360px] lg:w-96',
          selectedContact ? 'hidden md:flex' : 'flex'
        )}
      >
        <div className="shrink-0 space-y-3 px-4 pb-2 pt-4">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Chats</h2>
          <SearchField value={search} onValueChange={setSearch} placeholder="Search chats or phone numbers" />
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {chips.map((f) => (
              <Chip key={f.value} selected={filter === f.value} onClick={() => setFilter(f.value)}>
                {f.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-24">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonConversation key={i} />)
          ) : error ? (
            <div className="space-y-3 p-8 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="size-5" />
              </div>
              <p className="text-sm font-medium text-destructive">{error}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setError(null);
                  fetchConversations().catch(() => {});
                }}
              >
                Try again
              </Button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="space-y-2 p-8 text-center text-sm text-muted-foreground">
              <MessageSquare className="mx-auto mb-1 size-8 text-muted-foreground/50" />
              <p className="font-semibold text-foreground">No chats here</p>
              <p>Start a new chat, or change the filter or search.</p>
            </div>
          ) : (
            conversations.map((c) => {
              const contactObj = c.contact || c;
              return (
                <ChatListRow
                  key={c.id || contactObj.id}
                  conversation={c}
                  selected={selectedContact?.id === contactObj.id}
                  onSelect={() => handleSelect(c)}
                  onAction={(a) => handleRowAction(c, a)}
                />
              );
            })
          )}
        </div>

        {/* Round new-chat button, bottom right of the list (above the tab bar on phones). */}
        <Button
          variant="wa"
          size="icon-lg"
          className="absolute bottom-20 right-4 size-14 shadow-lg md:bottom-6"
          onClick={() => setIsNewChatOpen(true)}
          aria-label="New chat"
          title="New chat"
        >
          <Plus className="size-6" />
        </Button>
      </div>

      {/* Chat screen */}
      <div className={cn('flex h-full min-w-0 flex-1 flex-col bg-chat-canvas', selectedContact ? 'flex' : 'hidden md:flex')}>
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
              <h3 className="text-base font-semibold text-foreground">Pick a chat</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Choose a customer on the left to read and reply, or start a new chat.
              </p>
            </div>
            <div className="flex items-center gap-1.5 pt-4 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              <span>Your chats stay private to your team</span>
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
        <div className="flex h-full w-full items-center justify-center bg-background">
          <div className="size-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
        </div>
      }
    >
      <InboxContent />
    </Suspense>
  );
}
