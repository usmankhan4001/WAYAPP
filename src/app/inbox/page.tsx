'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  MessageSquare,
  Search,
  UserPlus,
  Sparkles,
  CheckCheck,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { ChatWindow } from '@/components/inbox/ChatWindow';
import { NewChatModal } from '@/components/inbox/NewChatModal';
import { formatTimeAgo } from '@/lib/utils';
import { SkeletonConversation } from '@/components/ui/Skeleton';

function InboxContent() {
  const searchParams = useSearchParams();
  const urlContactId = searchParams.get('contactId');

  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
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
        if (list.length > 0 && !selectedContact && !urlContactId && typeof window !== 'undefined' && window.innerWidth >= 1024) {
          const first = list[0];
          const contactObj = first.contact || first;
          setSelectedContact(contactObj);
          setSelectedConversation(first.id ? first : null);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError('Failed to load conversations. Please check your connection.');
        }
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
            if (found) {
              setSelectedContact(found);
            }
          }
        })
        .catch(() => {});
    } else {
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setSelectedContact(null);
      }
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

  const router = useRouter();

  const handleSelect = (conv: any) => {
    const contactObj = conv.contact || conv;
    // Native app feel: push to router so the mobile Back button returns to the list
    router.push(`/inbox?contactId=${contactObj.id}`);
  };

  return (
    <div className="h-full w-full flex overflow-hidden bg-[#f0f2f5] text-slate-900">
      {/* New Chat Modal */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onSelectContact={(contact) => {
          setSelectedContact(contact);
          fetchConversations();
        }}
      />

      {/* Left Column: WhatsApp Contact Threads Pane */}
      <div
        className={`w-full lg:w-96 lg:min-w-[360px] lg:max-w-[400px] h-full flex flex-col bg-white border-r border-slate-200 shrink-0 ${
          selectedContact ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Top Header & New Chat Trigger */}
        <div className="p-3.5 border-b border-slate-200 bg-[#f0f2f5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Chats</h2>
            {conversations.length > 0 && (
              <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                {conversations.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsNewChatOpen(true)}
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
              title="Start a new WhatsApp chat"
            >
              <UserPlus className="w-4 h-4" />
              <span className="text-xs font-semibold">New Chat</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-3 border-b border-slate-200 bg-white space-y-2.5 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chats or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-[#f0f2f5] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                filter === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1 ${
                filter === 'unread'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Unread</span>
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonConversation key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-xs text-red-600 font-medium">{error}</p>
              <button
                onClick={() => { setError(null); fetchConversations(); }}
                className="text-xs text-emerald-600 font-bold hover:underline"
              >
                Retry
              </button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-1" />
              <p className="font-semibold text-slate-700">No chats found</p>
              <p className="text-[11px] text-slate-400">Start a new conversation or adjust your search filter.</p>
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
                  className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 select-none ${
                    isSelected
                      ? 'bg-[#f0f2f5] border-l-4 border-emerald-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {/* WhatsApp Profile Avatar */}
                  <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                    {contactName.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-bold text-slate-900 truncate">{contactName}</span>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                        {c.lastMessageAt ? formatTimeAgo(new Date(c.lastMessageAt)) : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate mb-1">
                      {isOutbound && (
                        <CheckCheck
                          className={`w-3.5 h-3.5 shrink-0 ${
                            lastMsg?.status === 'READ'
                              ? 'text-[#53bdeb]'
                              : lastMsg?.status === 'DELIVERED'
                              ? 'text-slate-400'
                              : 'text-slate-300'
                          }`}
                        />
                      )}
                      <span className="truncate">{lastMsg?.body || 'Media Attachment'}</span>
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono text-slate-400 truncate">
                        {contactObj.phoneNumber}
                      </span>

                      {c.unreadCount > 0 && (
                        <span className="min-w-4 h-4 px-1 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
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

      {/* Right Column: Full-Height Native WhatsApp Chat Window */}
      <div className={`flex-1 h-full flex flex-col min-w-0 bg-[#efeae2] ${selectedContact ? 'flex' : 'hidden lg:flex'}`}>
        {selectedContact ? (
          <ChatWindow
            contact={selectedContact}
            onRefreshList={() => fetchConversations()}
            onBackMobile={() => router.push('/inbox')}
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-[#f0f2f5] space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shadow-lg">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="max-w-sm space-y-1">
              <h3 className="text-base font-bold text-slate-800">WAYAPP for Web & Desktop</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Select a customer thread from the left panel to begin live 1-to-1 WhatsApp chatting, send templates, or share media files.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
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
        <div className="h-full w-full flex items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <InboxContent />
    </Suspense>
  );
}
