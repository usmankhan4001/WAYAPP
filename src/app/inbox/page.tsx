'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Search, ArrowLeft } from 'lucide-react';
import { ChatWindow } from '@/components/inbox/ChatWindow';
import { formatTimeAgo } from '@/lib/utils';
import { InfoTooltip } from '@/components/ui/Tooltip';

export default function InboxPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchConversations = () => {
    fetch('/api/chat')
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setConversations(list);
        if (list.length > 0 && !selectedContact && typeof window !== 'undefined' && window.innerWidth >= 1024) {
          setSelectedContact(list[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 4000);
    return () => clearInterval(interval);
  }, []);

  const filtered = conversations.filter((c) => {
    const name = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
    const phone = c.phoneNumber?.toLowerCase() || '';
    const q = search.toLowerCase();
    return name.includes(q) || phone.includes(q);
  });

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Live 2-Way Chat Inbox</h1>
          <InfoTooltip content="Direct WhatsApp conversation threads with customers responding to your template broadcasts within the 24-hour service window." />
        </div>
        <p className="text-xs text-slate-500">
          Direct 2-way conversation threads with customers responding to your template broadcasts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Conversation List (Hidden on mobile if a chat is active) */}
        <div
          className={`lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[680px] ${
            selectedContact ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Search Header */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search conversations..."
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
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No active conversations yet
              </div>
            ) : (
              filtered.map((c) => {
                const isSelected = selectedContact?.id === c.id;
                const contactName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Customer';
                const lastMsg = c.chatMessages?.[0];

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedContact(c)}
                    className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-slate-100 border-l-4 border-emerald-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {contactName.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{contactName}</h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatTimeAgo(lastMsg?.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {lastMsg?.direction === 'OUTBOUND' && 'You: '}
                        {lastMsg?.body || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Chat Window (Full width on mobile when selected) */}
        <div
          className={`lg:col-span-8 ${
            selectedContact ? 'block' : 'hidden lg:block'
          }`}
        >
          {selectedContact ? (
            <ChatWindow
              contact={selectedContact}
              onRefreshList={fetchConversations}
              onBackMobile={() => setSelectedContact(null)}
            />
          ) : (
            <div className="h-[680px] bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-center p-8">
              <div className="max-w-sm space-y-2">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">Select a Conversation</h3>
                <p className="text-xs text-slate-500">
                  Pick a conversation from the list to view customer reply history and send live messages.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
