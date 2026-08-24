'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  ArrowLeft,
  User,
  Users,
  CheckCircle,
  Clock,
  Sparkles,
  Zap,
  Filter,
  UserCheck,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { ChatWindow } from '@/components/inbox/ChatWindow';
import { formatTimeAgo } from '@/lib/utils';
import { InfoTooltip } from '@/components/ui/Tooltip';
import { SkeletonConversation } from '@/components/ui/Skeleton';

export default function InboxPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'mine' | 'unassigned' | 'resolved' | 'spam'>('all');
  const [loading, setLoading] = useState(true);
  const [assigningRoundRobin, setAssigningRoundRobin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(() => {
    const controller = new AbortController();
    const url = `/api/chat?filter=${filter}&limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}`;

    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setConversations(list);
        if (list.length > 0 && !selectedContact && typeof window !== 'undefined' && window.innerWidth >= 1024) {
          const first = list[0];
          const contactObj = first.contact || first;
          setSelectedContact(contactObj);
          setSelectedConversation(first.id ? first : null);
        }
      })
      .catch((err) => { if (err.name !== 'AbortError') setError('Failed to load conversations. Please check your connection.'); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [filter, search, selectedContact]);

  useEffect(() => {
    const cancel = fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
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

  const handleRoundRobin = async () => {
    setAssigningRoundRobin(true);
    try {
      const res = await fetch('/api/chat/round-robin', { method: 'POST' });
      if (res.ok) {
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAssigningRoundRobin(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Team Inbox & Multi-Agent Chat</h1>
            <InfoTooltip content="Real-time multi-agent customer conversations with assignment routing, internal notes, and 24-hour service compliance." />
          </div>
          <p className="text-xs text-slate-500">
            Collaborate across team agents, manage unassigned threads, and reply within WhatsApp service windows
          </p>
        </div>

        <button
          onClick={handleRoundRobin}
          disabled={assigningRoundRobin}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>{assigningRoundRobin ? 'Routing...' : 'Round-Robin Assign'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Open', icon: MessageSquare },
          { id: 'mine', label: 'Assigned to Me', icon: User },
          { id: 'unassigned', label: 'Unassigned', icon: Users },
          { id: 'resolved', label: 'Resolved', icon: CheckCircle },
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
                placeholder="Search phone or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* List */}
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
              <div className="p-8 text-center text-xs text-slate-400">
                No active conversations matching this filter
              </div>
            ) : (
              conversations.map((c) => {
                const contactObj = c.contact || c;
                const isSelected = selectedContact?.id === contactObj.id;
                const contactName = `${contactObj.firstName || ''} ${contactObj.lastName || ''}`.trim() || 'Customer';
                const lastMsg = c.messages?.[0] || c.chatMessages?.[0];
                const assignee = c.assignedTo;

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

                      <p className="text-[11px] text-slate-500 truncate mb-1.5">
                        {lastMsg?.body || contactObj.phoneNumber}
                      </p>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {assignee ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold">
                            <User className="w-2.5 h-2.5" />
                            {assignee.name || assignee.email.split('@')[0]}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                            Unassigned
                          </span>
                        )}

                        {c.unreadCount > 0 && (
                          <span className="ml-auto w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
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
              <button
                onClick={() => setSelectedContact(null)}
                className="lg:hidden flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Conversations</span>
              </button>

              <ChatWindow
                contact={selectedContact}
                onRefreshList={() => fetchConversations()}
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3 h-[700px] flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Select a conversation</h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Pick a customer thread from the left panel to begin chatting, send templates, or assign team agents.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
