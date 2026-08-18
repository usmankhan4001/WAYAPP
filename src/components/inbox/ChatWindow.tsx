'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Clock,
  User,
  CheckCheck,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  FileText,
  Lock,
  ChevronDown,
} from 'lucide-react';
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 24h Window Calculation
  const lastInteraction = contact?.lastInteractionAt ? new Date(contact.lastInteractionAt).getTime() : null;
  const msSinceLast = lastInteraction ? Date.now() - lastInteraction : Infinity;
  const msRemaining = Math.max(0, 24 * 60 * 60 * 1000 - msSinceLast);
  const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const isWindowActive = msRemaining > 0;

  const fetchMessages = () => {
    if (!contact?.id) return;
    fetch(`/api/chat?contactId=${contact.id}`)
      .then((res) => res.json())
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  const fetchTemplates = () => {
    fetch('/api/templates')
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data.filter((t) => t.status === 'APPROVED') : [];
        setTemplates(list);
        if (list.length > 0 && !selectedTemplate) {
          setSelectedTemplate(list[0]);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchMessages();
    fetchTemplates();
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
    setErrorMessage(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          text: text.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMessage(data.error || 'Failed to send message');
      } else {
        setText('');
        fetchMessages();
        onRefreshList();
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTemplate = async (template: any) => {
    if (!contact?.id || !template) return;
    setIsSending(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          templateName: template.name,
          languageCode: template.language || 'en_US',
          bodyVariables: [contact.firstName || 'Customer'],
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMessage(data.error || 'Failed to dispatch template message');
      } else {
        setIsTemplatePickerOpen(false);
        fetchMessages();
        onRefreshList();
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
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

          <Tooltip
            content={
              isWindowActive
                ? `Meta allows freeform 2-way messaging for 24 hours. Window closes in ${hoursRemaining}h ${minutesRemaining}m.`
                : '24-hour conversation window has expired. You must send a pre-approved Template to re-engage this customer.'
            }
          >
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                isWindowActive
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <Clock className={`w-3 h-3 ${isWindowActive ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span>
                {isWindowActive
                  ? `24h Active (${hoursRemaining}h ${minutesRemaining}m)`
                  : '24h Window Closed'}
              </span>
            </div>
          </Tooltip>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-red-500 hover:text-red-800 font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

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

        {/* Input Bar or Window Expired Template Trigger */}
        <div className="p-3 md:p-4 bg-slate-50 border-t border-slate-200">
          {!isWindowActive ? (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800">
                  <strong>24h Window Expired:</strong> Send a pre-approved WhatsApp template to re-open the conversation window.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplatePickerOpen(!isTemplatePickerOpen)}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 shadow-sm flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Send Template</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSend} className="flex items-center gap-2 md:gap-3">
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
          )}

          {/* Quick Template Picker Drawer */}
          {isTemplatePickerOpen && (
            <div className="mt-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Select Approved Template to Re-Engage</span>
                <button
                  onClick={() => setIsTemplatePickerOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Close
                </button>
              </div>

              {templates.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">
                  No approved templates found. Create or sync templates in the Templates tab.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="p-2.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 flex items-center justify-between gap-2 cursor-pointer transition-all"
                      onClick={() => handleSendTemplate(tpl)}
                    >
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-slate-900 font-mono">{tpl.name}</h5>
                        <p className="text-[10px] text-slate-500 truncate">{tpl.category} • {tpl.language}</p>
                      </div>
                      <button
                        type="button"
                        disabled={isSending}
                        className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold shrink-0"
                      >
                        {isSending ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar: Contact Profile */}
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
