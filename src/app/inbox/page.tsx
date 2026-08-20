'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  MessageSquare,
  Search,
  ArrowLeft,
  User,
  CheckCircle,
  Clock,
  Sparkles,
  UserPlus,
  RefreshCw,
} from 'lucide-react';
import { ChatWindow } from '@/components/inbox/ChatWindow';
import { NewChatModal } from '@/components/inbox/NewChatModal';
import { formatTimeAgo } from '@/lib/utils';
import { InfoTooltip } from '@/components/ui/Tooltip';

function InboxContent() {
  const searchParams = useSearchParams();
  const urlContactId = searchParams.get('contactId');

  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  const fetchConversations = useCallback(() => {
    const controller = new AbortController();
    const url = `/api/chat?filter=${filter}${search ? `&search=${encodeURIComponent(search)}` : ''}`;

    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setConversations(list);
        if (list.length > 0 && !selectedContact && !urlContactId && typeof window !== 'undefined' && window.innerWidth >= 1024) {
          const first = list[0];
          const contactObj = first.contact || first;
          setSelectedContact(contactObj);
          setSelectedConversation(first.id ? first : null);
        }
      })
      .catch(() => {})
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

  const handleSelect = (conv: any) => {
    const contactObj = conv.contact || conv;
    setSelectedContact(contactObj);
    setSelectedConversation(conv.id ? conv : null);
  };

  return (
    <div className="space-y-4">
      {/* New Chat Modal */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onSelectContact={(contact) => {
          setSelectedContact(contact);
          fetchConversations();
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">1-to-1 WhatsApp Live Chat</h1>
            <InfoTooltip content="Direct two-way customer messaging with instant replies, media sharing, voice notes, and approved template integration." />
          </div>
          <p className="text-xs text-slate-500">
            Real-time one-to-one conversation experience with your WhatsApp contacts
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsNewChatOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Chats', icon: MessageSquare },
          { id: 'unread', label: 'Unread', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Conversation List */}
        <div
          className={`lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px] ${
            selectedContact ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Search Header */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by contact or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="py-16 flex justify-center">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No active conversations matching your search
              </div>
            ) : (
              conversations.map((c) => {
                const contactObj = c.contact || c;
                const isSelected = selectedContact?.id === contactObj.id;
                const contactName = `${contactObj.firstName || ''} ${contactObj.lastName || ''}`.trim() || 'Customer';
                const lastMsg = c.messages?.[0] || c.chatMessages?.[0];

                return (
                  <div
                    key={c.id || contactObj.id}
                    onClick={() => handleSelect(c)}
                    className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-emerald-50/80 border-l-4 border-emerald-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {contactName.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-slate-900 truncate">{contactName}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {c.lastMessageAt ? formatTimeAgo(new Date(c.lastMessageAt)) : ''}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 truncate mb-1">
                        {lastMsg?.body || contactObj.phoneNumber}
                      </p>

                      <div className="flex items-center gap-1.5 justify-between">
                        <span className="text-[10px] font-mono text-slate-400 truncate">
                          {contactObj.phoneNumber}
                        </span>

                        {c.unreadCount > 0 && (
                          <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
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

        {/* Right Side: Active Chat Window */}
        <div className={`lg:col-span-8 ${selectedContact ? 'block' : 'hidden lg:block'}`}>
          {selectedContact ? (
            <div className="space-y-2">
              <ChatWindow
                contact={selectedContact}
                onRefreshList={() => fetchConversations()}
                onBackMobile={() => setSelectedContact(null)}
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3 h-[700px] flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Select a conversation</h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Pick a customer thread from the left panel to begin chatting, send templates, or share media.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex justify-center">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <InboxContent />
    </Suspense>
  );
}

