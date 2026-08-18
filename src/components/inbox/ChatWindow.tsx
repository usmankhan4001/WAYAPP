'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Clock, User, CheckCheck, Sparkles, ArrowLeft } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { InfoTooltip, Tooltip } from '@/components/ui/Tooltip';

interface ChatWindowProps {
  contact: any;
  onRefreshList: () => void;
  onBackMobile?: () => void;
}

export function ChatWindow({ contact, onRefreshList, onBackMobile }: ChatWindowProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = () => {
    if (!contact?.id) return;
    fetch(`/api/chat?contactId=${contact.id}`)
      .then((res) => res.json())
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [contact?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !contact?.id) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          text: text.trim(),
        }),
      });

      if (res.ok) {
        setText('');
        fetchMessages();
        onRefreshList();
      }
    } catch {}
    finally {
      setIsSending(false);
    }
  };

  let customAttrs: any = {};
  try {
    customAttrs = contact?.customAttributes ? JSON.parse(contact.customAttributes) : {};
  } catch {}

  const contactName = `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim() || 'Customer';

  return (
    <div className="flex-1 flex bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[680px]">
      {/* Main Chat Thread */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200">
        {/* Chat Top Bar */}
        <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            {onBackMobile && (
              <button
                onClick={onBackMobile}
                className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors"
                title="Back to Conversations"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
              {contactName.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{contactName}</h3>
              <p className="text-[11px] text-slate-500 font-mono truncate">{contact?.phoneNumber}</p>
            </div>
          </div>

          <Tooltip content="Meta allows freeform 2-way messaging for 24 hours after a customer initiates contact or responds to a template.">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
              <Clock className="w-3 h-3 text-emerald-600" />
              <span className="hidden sm:inline">24h Window Active</span>
              <span className="sm:hidden">24h Active</span>
            </div>
          </Tooltip>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 md:p-6 whatsapp-bg overflow-y-auto space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div className="p-4 bg-white rounded-xl border border-slate-200 max-w-sm shadow-sm">
                <Sparkles className="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-800">No conversation history</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Send a live reply or wait for the customer to respond to your broadcast.
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isOutbound = msg.direction === 'OUTBOUND';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm text-xs ${
                      isOutbound
                        ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none'
                        : 'bg-white text-slate-900 rounded-tl-none border border-slate-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                      <span>{formatDateTime(msg.timestamp)}</span>
                      {isOutbound && (
                        <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 md:p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2 md:gap-3">
          <input
            type="text"
            placeholder="Type your WhatsApp reply..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={isSending || !text.trim()}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>

      {/* Right Sidebar: Contact Profile (Hidden on tablet/mobile for space) */}
      <div className="w-64 bg-slate-50/70 p-4 overflow-y-auto space-y-4 hidden xl:block shrink-0">
        <div className="text-center pb-3 border-b border-slate-200">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-bold text-base flex items-center justify-center mx-auto mb-2 shadow-sm">
            {contactName.substring(0, 2).toUpperCase()}
          </div>
          <h4 className="text-xs font-bold text-slate-900">{contactName}</h4>
          <p className="text-[11px] text-slate-500 font-mono">{contact?.phoneNumber}</p>
        </div>

        {/* Groups */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Groups</span>
          <div className="flex flex-wrap gap-1">
            {contact?.groups?.length > 0 ? (
              contact.groups.map((g: any) => (
                <span
                  key={g.groupId}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-800"
                >
                  {g.group?.name}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-slate-400">No groups</span>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tags</span>
          <div className="flex flex-wrap gap-1">
            {contact?.tags?.length > 0 ? (
              contact.tags.map((t: any) => (
                <span
                  key={t.tagId}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800"
                >
                  {t.tag?.name}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-slate-400">No tags</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
