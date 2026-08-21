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
  Paperclip,
  Mic,
  Image as ImageIcon,
  Video,
  File as FileIcon,
  Music,
  X,
  Download,
  ExternalLink,
  MapPin,
  Loader2,
  Zap,
  CreditCard,
  Calendar,
  ShoppingBag,
  Globe,
  Wand2,
  Tag as TagIcon,
  DollarSign,
  Plus,
  StickyNote,
  History,
  CheckCircle2,
  UserCheck,
  Building,
} from 'lucide-react';
import { formatDateTime, formatTimeAgo } from '@/lib/utils';
import { InfoTooltip, Tooltip } from '@/components/ui/Tooltip';
import { AudioVoicePlayer } from './AudioVoicePlayer';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';
import { MediaLightbox } from './MediaLightbox';

interface ChatWindowProps {
  contact: any;
  onRefreshList: () => void;
  onBackMobile?: () => void;
}

interface StagedMedia {
  file: File;
  previewUrl: string;
  mediaType: 'image' | 'video' | 'audio' | 'document';
  caption: string;
}

const LEAD_STAGES = [
  { id: 'NEW_LEAD', label: 'New Lead', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'CONTACTED', label: 'Contacted', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'QUALIFIED', label: 'Qualified', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'PROPOSAL_SENT', label: 'Proposal Sent', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { id: 'WON', label: 'Deal Won', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'LOST', label: 'Deal Lost', color: 'bg-rose-100 text-rose-800 border-rose-300' },
];

export function ChatWindow({ contact, onRefreshList, onBackMobile }: ChatWindowProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [stagedMedia, setStagedMedia] = useState<StagedMedia | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<{
    url: string;
    type: 'image' | 'video' | 'document' | 'audio';
    caption?: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Active Modules State
  const [modules, setModules] = useState<{
    ai_copilot: boolean;
    canned_snippets: boolean;
    lead_crm: boolean;
  }>({
    ai_copilot: true,
    canned_snippets: true,
    lead_crm: true,
  });

  // AI Co-Pilot State
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState('Arabic');

  // Canned Snippets State
  const [snippets, setSnippets] = useState<any[]>([]);
  const [showSnippetDropdown, setShowSnippetDropdown] = useState(false);
  const [snippetFilter, setSnippetFilter] = useState('');

  // Quick Action Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState('150');
  const [invoiceItem, setInvoiceItem] = useState('Annual Enterprise Subscription');

  // CRM Side-Panel State
  const [activeCrmTab, setActiveCrmTab] = useState<'details' | 'notes' | 'timeline'>('details');
  const [crmData, setCrmData] = useState<any>(null);
  const [leadStage, setLeadStage] = useState(contact?.leadStage || 'NEW_LEAD');
  const [dealValue, setDealValue] = useState(contact?.dealValue || 0);
  const [company, setCompany] = useState(contact?.company || '');
  const [city, setCity] = useState(contact?.city || '');
  const [newNoteText, setNewNoteText] = useState('');
  const [isSavingCrm, setIsSavingCrm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputTypeRef = useRef<'image' | 'video' | 'audio' | 'document'>('image');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);

  // 24h Window Calculation
  const lastInteraction = contact?.lastInteractionAt ? new Date(contact.lastInteractionAt).getTime() : null;
  const msSinceLast = lastInteraction ? Date.now() - lastInteraction : Infinity;
  const msRemaining = Math.max(0, 24 * 60 * 60 * 1000 - msSinceLast);
  const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const isWindowActive = msRemaining > 0;

  // Load modules
  useEffect(() => {
    fetch('/api/modules')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.modules)) {
          const map: any = {};
          data.modules.forEach((m: any) => {
            map[m.id] = m.isEnabled;
          });
          setModules({
            ai_copilot: map.ai_copilot !== false,
            canned_snippets: map.canned_snippets !== false,
            lead_crm: map.lead_crm !== false,
          });
        }
      })
      .catch(() => {});
  }, []);

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

  const fetchSnippets = () => {
    fetch('/api/chat/snippets')
      .then((res) => res.json())
      .then((data) => setSnippets(data.snippets || []))
      .catch(() => {});
  };

  const fetchCrmData = () => {
    if (!contact?.id) return;
    fetch(`/api/chat/contact-crm?contactId=${contact.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.contact) {
          setCrmData(data);
          setLeadStage(data.contact.leadStage || 'NEW_LEAD');
          setDealValue(data.contact.dealValue || 0);
          setCompany(data.contact.company || '');
          setCity(data.contact.city || '');
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchMessages();
    fetchTemplates();
    fetchSnippets();
    fetchCrmData();
    setAiSuggestions([]);
    setSummaryText(null);

    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [contact?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle snippet trigger on '/'
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);

    if (modules.canned_snippets && val.startsWith('/')) {
      setShowSnippetDropdown(true);
      setSnippetFilter(val.toLowerCase());
    } else {
      setShowSnippetDropdown(false);
    }
  };

  const handleSelectSnippet = async (snippet: any) => {
    setText(snippet.content);
    setShowSnippetDropdown(false);
    textInputRef.current?.focus();

    // Increment usage
    fetch('/api/chat/snippets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'use', id: snippet.id }),
    }).catch(() => {});
  };

  // AI Co-Pilot Actions
  const handleAiSuggestReply = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/chat/ai-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest_reply',
          contactId: contact.id,
          chatHistory: messages.slice(-6),
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.suggestions)) {
        setAiSuggestions(data.suggestions);
      }
    } catch {} finally {
      setIsAiLoading(false);
    }
  };

  const handleAiPolishText = async () => {
    if (!text.trim()) return;
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/chat/ai-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'polish', text }),
      });
      const data = await res.json();
      if (data.polished) {
        setText(data.polished);
      }
    } catch {} finally {
      setIsAiLoading(false);
    }
  };

  const handleAiTranslate = async () => {
    if (!text.trim()) return;
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/chat/ai-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'translate', text, targetLanguage: targetLang }),
      });
      const data = await res.json();
      if (data.translated) {
        setText(data.translated);
      }
    } catch {} finally {
      setIsAiLoading(false);
    }
  };

  const handleAiSummarize = async () => {
    setIsSummarizing(true);
    try {
      const res = await fetch('/api/chat/ai-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'summarize',
          contactId: contact.id,
          chatHistory: messages.slice(-12),
        }),
      });
      const data = await res.json();
      if (data.summary) {
        setSummaryText(data.summary);
      }
    } catch {} finally {
      setIsSummarizing(false);
    }
  };

  // 1-Click Quick Actions
  const handleInsertPaymentLink = () => {
    const paymentMsg = `💳 *Invoice for ${invoiceItem}*\nTotal Amount: $${invoiceAmount}\nPlease complete your secure checkout here: https://pay.gccstartup.com/inv-${Date.now().toString().slice(-6)}\nThank you! ✨`;
    setText(paymentMsg);
    setIsInvoiceModalOpen(false);
    textInputRef.current?.focus();
  };

  const handleInsertMeetingLink = () => {
    const meetMsg = `📅 *Schedule a 1-on-1 Consultation*\nYou can pick a convenient 15-minute slot on our team calendar here: https://calendly.com/gccstartup/consultation\nLooking forward to speaking with you! 🚀`;
    setText(meetMsg);
    textInputRef.current?.focus();
  };

  const handleInsertCatalogLink = () => {
    const catalogMsg = `📄 *Official Product Catalog & Pricing*\nYou can view our complete product catalog and latest offers here: https://gccstartup.com/catalog.pdf\nLet me know if you have any questions! 😊`;
    setText(catalogMsg);
    textInputRef.current?.focus();
  };

  // CRM Updates
  const handleSaveCrmDetails = async (newStage?: string, newAssigneeId?: string) => {
    setIsSavingCrm(true);
    try {
      const res = await fetch('/api/chat/contact-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          leadStage: newStage || leadStage,
          dealValue,
          company,
          city,
          assignToId: newAssigneeId,
        }),
      });
      if (res.ok) {
        fetchCrmData();
        onRefreshList();
      }
    } catch {} finally {
      setIsSavingCrm(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    try {
      const res = await fetch('/api/chat/contact-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          noteText: newNoteText,
        }),
      });
      if (res.ok) {
        setNewNoteText('');
        fetchCrmData();
      }
    } catch {}
  };

  const triggerFileInput = (type: 'image' | 'video' | 'audio' | 'document') => {
    fileInputTypeRef.current = type;
    setIsAttachmentMenuOpen(false);

    if (fileInputRef.current) {
      if (type === 'image') fileInputRef.current.accept = 'image/*';
      else if (type === 'video') fileInputRef.current.accept = 'video/*';
      else if (type === 'audio') fileInputRef.current.accept = 'audio/*';
      else fileInputRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt';

      fileInputRef.current.click();
    }
  };

  const handleFileSelected = (file: File) => {
    const mime = file.type || '';
    let mediaType: 'image' | 'video' | 'audio' | 'document' = fileInputTypeRef.current;

    if (mime.startsWith('image/')) mediaType = 'image';
    else if (mime.startsWith('video/')) mediaType = 'video';
    else if (mime.startsWith('audio/')) mediaType = 'audio';
    else if (mime.includes('pdf') || mime.includes('document') || mime.includes('sheet') || mime.includes('csv')) mediaType = 'document';

    const previewUrl = URL.createObjectURL(file);
    setStagedMedia({
      file,
      previewUrl,
      mediaType,
      caption: '',
    });
  };

  const handleSendStagedMedia = async () => {
    if (!stagedMedia || !contact?.id) return;

    setIsSending(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', stagedMedia.file);

      const uploadRes = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to media server.');
      }

      const uploadData = await uploadRes.json();
      const mediaUrl = uploadData.url;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          messageType: stagedMedia.mediaType,
          mediaUrl,
          text: stagedMedia.caption || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to dispatch media message.');
      }

      setStagedMedia(null);
      fetchMessages();
      onRefreshList();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error sending attachment.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendVoiceNote = async (blob: Blob) => {
    if (!contact?.id) return;
    setIsRecordingVoice(false);
    setIsSending(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', blob, `voice_${Date.now()}.mp3`);

      const uploadRes = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Voice note upload failed.');

      const uploadData = await uploadRes.json();
      const mediaUrl = uploadData.url;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          messageType: 'voice',
          mediaUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to dispatch voice message.');
      }

      fetchMessages();
      onRefreshList();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error sending voice note.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !contact?.id) return;

    setIsSending(true);
    setErrorMessage(null);
    setAiSuggestions([]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          messageType: 'text',
          text: text.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send message.');
      }

      setText('');
      fetchMessages();
      onRefreshList();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error dispatching message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTemplate = async (template: any) => {
    if (!template || !contact?.id) return;

    setIsSending(true);
    setErrorMessage(null);
    setIsTemplatePickerOpen(false);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          messageType: 'template',
          templateId: template.id,
          templateName: template.name,
          language: template.language || 'en_US',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send template message.');
      }

      fetchMessages();
      onRefreshList();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error dispatching template.');
    } finally {
      setIsSending(false);
    }
  };

  const contactName = contact?.firstName
    ? `${contact.firstName} ${contact.lastName || ''}`.trim()
    : contact?.phoneNumber;

  const currentStageObj = LEAD_STAGES.find((s) => s.id === leadStage) || LEAD_STAGES[0];

  return (
    <div className="flex h-full min-h-[600px] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
        }}
      />

      {/* Lightbox */}
      {lightboxMedia && (
        <MediaLightbox
          mediaUrl={lightboxMedia.url}
          mediaType={lightboxMedia.type}
          caption={lightboxMedia.caption}
          onClose={() => setLightboxMedia(null)}
        />
      )}

      {/* Main Conversation Stream & Input Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
        {/* Chat Header */}
        <div className="h-16 px-4 border-b border-slate-200 bg-white flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {onBackMobile && (
              <button
                onClick={onBackMobile}
                className="lg:hidden p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm ring-2 ring-emerald-500/20">
              {contactName.substring(0, 2).toUpperCase()}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 truncate">{contactName}</h3>
                {modules.lead_crm && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${currentStageObj.color}`}>
                    {currentStageObj.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono truncate">{contact?.phoneNumber}</p>
            </div>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center gap-2">
            {/* 24-hour service compliance badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 border ${
                isWindowActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isWindowActive
                  ? `${hoursRemaining}h ${minutesRemaining}m window`
                  : '24h Window Expired'}
              </span>
            </div>

            {/* AI Summarize Chat Button */}
            {modules.ai_copilot && (
              <button
                onClick={handleAiSummarize}
                disabled={isSummarizing}
                title="Generate 3-bullet AI chat summary"
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 flex items-center gap-1 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden md:inline">{isSummarizing ? 'Summarizing...' : 'Summarize'}</span>
              </button>
            )}
          </div>
        </div>

        {/* AI Summary Banner (if active) */}
        {summaryText && (
          <div className="mx-4 mt-3 p-3.5 rounded-xl bg-purple-50/80 border border-purple-200 shadow-sm relative animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>AI Sales Handover Summary</span>
              </div>
              <button onClick={() => setSummaryText(null)} className="text-purple-400 hover:text-purple-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="text-xs text-purple-800 font-sans whitespace-pre-wrap leading-relaxed">
              {summaryText}
            </pre>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                <User className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600">No messages yet with {contactName}</p>
              <p className="text-xs max-w-xs mt-1">
                {isWindowActive
                  ? 'Send a friendly greeting or pick an approved template below.'
                  : 'The 24h conversation window is expired. Send an approved template to start chatting.'}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isInbound = msg.direction === 'INBOUND';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 text-xs shadow-sm relative group ${
                      isInbound
                        ? 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                        : 'bg-emerald-600 text-white rounded-tr-none'
                    }`}
                  >
                    {/* Media Attachments Rendering */}
                    {msg.mediaUrl && (
                      <div className="mb-2 rounded-lg overflow-hidden border border-black/10">
                        {msg.messageType === 'image' ? (
                          <img
                            src={msg.mediaUrl}
                            alt="Attachment"
                            className="max-h-60 w-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() =>
                              setLightboxMedia({
                                url: msg.mediaUrl,
                                type: 'image',
                                caption: msg.body,
                              })
                            }
                          />
                        ) : msg.messageType === 'video' ? (
                          <video
                            src={msg.mediaUrl}
                            controls
                            className="max-h-60 w-full rounded-lg bg-black"
                          />
                        ) : msg.messageType === 'audio' || msg.messageType === 'voice' ? (
                          <AudioVoicePlayer
                            src={msg.mediaUrl}
                            isOutbound={!isInbound}
                          />
                        ) : (
                          <a
                            href={msg.mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 p-2 rounded-lg ${
                              isInbound ? 'bg-slate-100 text-slate-800' : 'bg-emerald-700 text-white'
                            }`}
                          >
                            <FileIcon className="w-5 h-5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold truncate">{msg.body || 'Download Attachment'}</p>
                              <span className="text-[10px] opacity-75">Click to view document</span>
                            </div>
                            <Download className="w-4 h-4 shrink-0" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Text Body */}
                    {msg.body && (
                      <p className="whitespace-pre-wrap break-words leading-relaxed font-sans">
                        {msg.body}
                      </p>
                    )}

                    {/* Meta & Status Timestamps */}
                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                        isInbound ? 'text-slate-400' : 'text-emerald-100'
                      }`}
                    >
                      <span>{formatDateTime(msg.timestamp)}</span>
                      {!isInbound && (
                        <CheckCheck
                          className={`w-3.5 h-3.5 ${
                            msg.status === 'READ' || msg.status === 'REPLIED'
                              ? 'text-cyan-300'
                              : 'text-emerald-200'
                          }`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mx-4 mb-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* AI Reply Suggestions Pills */}
        {modules.ai_copilot && aiSuggestions.length > 0 && (
          <div className="mx-4 mb-2 p-2.5 rounded-xl bg-purple-50/90 border border-purple-200 space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>AI Suggested Sales Replies (1-Click to Insert):</span>
              </span>
              <button onClick={() => setAiSuggestions([])} className="text-purple-400 hover:text-purple-700">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {aiSuggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setText(sug);
                    setAiSuggestions([]);
                    textInputRef.current?.focus();
                  }}
                  className="p-2 text-left rounded-lg bg-white hover:bg-purple-100/50 border border-purple-200 text-xs text-slate-800 transition-all font-medium"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sales Action Bar & AI Co-Pilot Toolbar */}
        <div className="px-4 py-1.5 bg-slate-100/80 border-t border-slate-200 flex items-center justify-between gap-2 overflow-x-auto">
          {/* Left: 1-Click Sales Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {modules.canned_snippets && (
              <>
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 flex items-center gap-1 shadow-2xs transition-all"
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Send Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={handleInsertCatalogLink}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-700 text-slate-700 flex items-center gap-1 shadow-2xs transition-all"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                  <span>Catalog</span>
                </button>

                <button
                  type="button"
                  onClick={handleInsertMeetingLink}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:border-purple-500 hover:text-purple-700 text-slate-700 flex items-center gap-1 shadow-2xs transition-all"
                >
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <span>Book Meeting</span>
                </button>
              </>
            )}
          </div>

          {/* Right: AI Sales Co-Pilot Actions */}
          {modules.ai_copilot && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleAiSuggestReply}
                disabled={isAiLoading}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center gap-1 shadow-xs transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAiLoading ? 'Drafting...' : 'Suggest Reply'}</span>
              </button>

              {text.trim() && (
                <>
                  <button
                    type="button"
                    onClick={handleAiPolishText}
                    disabled={isAiLoading}
                    title="Polish grammar and tone"
                    className="px-2 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1 transition-all"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>Polish</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAiTranslate}
                    disabled={isAiLoading}
                    title={`Translate to ${targetLang}`}
                    className="px-2 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1 transition-all"
                  >
                    <Globe className="w-3.5 h-3.5 text-cyan-600" />
                    <span>To {targetLang}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Input Bar & Attachment Controls */}
        <div className="p-3 bg-white border-t border-slate-200 relative">
          {/* Canned Snippet Suggestions Autocomplete Drawer */}
          {showSnippetDropdown && (
            <div className="absolute bottom-16 left-4 right-4 bg-white rounded-2xl border border-slate-300 shadow-2xl p-2 z-40 max-h-52 overflow-y-auto space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Canned Snippets (Type shortcut or click to insert)</span>
                <span className="text-[10px] text-slate-400">Esc to close</span>
              </div>
              {snippets
                .filter((s) => s.shortcut.toLowerCase().includes(snippetFilter))
                .map((snip) => (
                  <div
                    key={snip.id}
                    onClick={() => handleSelectSnippet(snip)}
                    className="p-2 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 border border-transparent flex items-center justify-between gap-2 cursor-pointer transition-all"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                          {snip.shortcut}
                        </span>
                        <span className="font-bold text-xs text-slate-800 truncate">{snip.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{snip.content}</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                      {snip.category}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {/* Staged Media Preview */}
          {stagedMedia && (
            <div className="mb-2 p-2 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {stagedMedia.mediaType === 'image' && (
                  <img src={stagedMedia.previewUrl} className="w-10 h-10 object-cover rounded-lg" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{stagedMedia.file.name}</p>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">{stagedMedia.mediaType}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStagedMedia(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleSendStagedMedia}
                  disabled={isSending}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
                >
                  {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Send Media</span>
                </button>
              </div>
            </div>
          )}

          {/* Voice Recorder Overlay */}
          {isRecordingVoice ? (
            <VoiceNoteRecorder
              onSendVoiceNote={handleSendVoiceNote}
              onCancel={() => setIsRecordingVoice(false)}
            />
          ) : !isWindowActive ? (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800">
                  <strong>24h Window Expired:</strong> Send an approved WhatsApp template to safely re-open the conversation.
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
            <div className="relative">
              {/* Attachment Popover */}
              {isAttachmentMenuOpen && (
                <div className="absolute bottom-14 left-0 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 z-30 grid grid-cols-2 gap-1.5 min-w-[200px] animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <button
                    type="button"
                    onClick={() => triggerFileInput('image')}
                    className="p-2 rounded-xl hover:bg-slate-100 flex items-center gap-2 text-xs font-semibold text-slate-700"
                  >
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <span>Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerFileInput('video')}
                    className="p-2 rounded-xl hover:bg-slate-100 flex items-center gap-2 text-xs font-semibold text-slate-700"
                  >
                    <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                      <Video className="w-4 h-4" />
                    </div>
                    <span>Video</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerFileInput('document')}
                    className="p-2 rounded-xl hover:bg-slate-100 flex items-center gap-2 text-xs font-semibold text-slate-700"
                  >
                    <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                      <FileIcon className="w-4 h-4" />
                    </div>
                    <span>Document / PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerFileInput('audio')}
                    className="p-2 rounded-xl hover:bg-slate-100 flex items-center gap-2 text-xs font-semibold text-slate-700"
                  >
                    <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                      <Music className="w-4 h-4" />
                    </div>
                    <span>Audio File</span>
                  </button>
                </div>
              )}

              <form onSubmit={handleSend} className="flex items-center gap-2 md:gap-3">
                <button
                  type="button"
                  onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                  className={`p-2 rounded-xl transition-all ${
                    isAttachmentMenuOpen
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-slate-500 hover:bg-slate-200'
                  }`}
                  title="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  ref={textInputRef}
                  type="text"
                  placeholder={
                    modules.canned_snippets
                      ? 'Type your WhatsApp reply or "/" for quick sales snippets...'
                      : 'Type your WhatsApp reply...'
                  }
                  value={text}
                  onChange={handleTextChange}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                {!text.trim() && (
                  <button
                    type="button"
                    onClick={() => setIsRecordingVoice(true)}
                    className="p-2 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-slate-200 transition-all"
                    title="Record voice note"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}

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
          )}

          {/* Quick Template Picker Drawer */}
          {isTemplatePickerOpen && (
            <div className="mt-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Select Approved Template to Re-Engage</span>
                <button onClick={() => setIsTemplatePickerOpen(false)} className="text-xs text-slate-400 hover:text-slate-600">
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
                        <p className="text-[10px] text-slate-500 truncate">{tpl.category} &bull; {tpl.language}</p>
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

      {/* Invoice Generator Modal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 max-w-sm w-full space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>1-Click Payment Link Generator</span>
              </h4>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Item / Service Description</label>
              <input
                type="text"
                value={invoiceItem}
                onChange={(e) => setInvoiceItem(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Amount ($ USD)</label>
              <input
                type="number"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertPaymentLink}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white flex items-center gap-1 shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Insert in Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right Sidebar: In-Chat Visual Lead CRM Panel */}
      {modules.lead_crm && (
        <div className="w-72 bg-slate-50 border-l border-slate-200 flex flex-col shrink-0 hidden xl:flex">
          {/* CRM Tabs Header */}
          <div className="p-2 border-b border-slate-200 bg-white grid grid-cols-3 gap-1">
            <button
              onClick={() => setActiveCrmTab('details')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                activeCrmTab === 'details'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveCrmTab('notes')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1 ${
                activeCrmTab === 'notes'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <span>Notes</span>
              {crmData?.contact?.conversation?.notes?.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 text-[10px] flex items-center justify-center font-black">
                  {crmData.contact.conversation.notes.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveCrmTab('timeline')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                activeCrmTab === 'timeline'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Timeline
            </button>
          </div>

          {/* CRM Content */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {activeCrmTab === 'details' && (
              <>
                {/* Contact Header */}
                <div className="text-center pb-3 border-b border-slate-200">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-bold text-base flex items-center justify-center mx-auto mb-2 shadow-sm">
                    {contactName.substring(0, 2).toUpperCase()}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">{contactName}</h4>
                  <p className="text-[11px] text-slate-500 font-mono">{contact?.phoneNumber}</p>
                </div>

                {/* Lead Stage Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Deal Stage
                  </label>
                  <select
                    value={leadStage}
                    onChange={(e) => {
                      setLeadStage(e.target.value);
                      handleSaveCrmDetails(e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {LEAD_STAGES.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Deal Value */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-slate-400" />
                    <span>Estimated Deal Value</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={dealValue}
                      onChange={(e) => setDealValue(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveCrmDetails()}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold shrink-0"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* Company & City */}
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Company</label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Dubai / Riyadh"
                      className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white mt-1"
                    />
                  </div>
                </div>

                {/* Assigned Agent */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-slate-400" />
                    <span>Assigned Sales Rep</span>
                  </label>
                  <select
                    value={crmData?.contact?.conversation?.assignedToId || ''}
                    onChange={(e) => handleSaveCrmDetails(undefined, e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">Unassigned</option>
                    {crmData?.allAgents?.map((agent: any) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name || agent.email} ({agent.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tags</label>
                  <div className="flex flex-wrap gap-1">
                    {crmData?.contact?.tags?.map((t: any) => (
                      <span
                        key={t.tagId}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800"
                      >
                        {t.tag?.name}
                      </span>
                    ))}
                    {(!crmData?.contact?.tags || crmData?.contact?.tags.length === 0) && (
                      <span className="text-[11px] text-slate-400">No tags assigned</span>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeCrmTab === 'notes' && (
              <div className="space-y-3">
                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea
                    rows={3}
                    placeholder="Write a private sales note (visible only to team agents)..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="w-full p-2 text-xs rounded-xl border border-amber-300 bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-amber-800/40"
                  />
                  <button
                    type="submit"
                    disabled={!newNoteText.trim()}
                    className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                  >
                    Add Private Note
                  </button>
                </form>

                <div className="space-y-2 pt-2">
                  {crmData?.contact?.conversation?.notes?.map((n: any) => (
                    <div key={n.id} className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1 text-xs">
                      <p className="text-amber-950 whitespace-pre-wrap">{n.body}</p>
                      <div className="flex items-center justify-between text-[10px] text-amber-700/70 pt-1 border-t border-amber-200/50">
                        <span>{n.author?.name || 'Agent'}</span>
                        <span>{formatTimeAgo(n.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                  {(!crmData?.contact?.conversation?.notes || crmData.contact.conversation.notes.length === 0) && (
                    <p className="text-xs text-slate-400 text-center py-4">No notes added yet.</p>
                  )}
                </div>
              </div>
            )}

            {activeCrmTab === 'timeline' && (
              <div className="space-y-3">
                <div className="space-y-2 text-xs">
                  {crmData?.contact?.conversation?.events?.map((ev: any) => (
                    <div key={ev.id} className="p-2 rounded-lg bg-white border border-slate-200 space-y-0.5">
                      <span className="font-bold text-[10px] text-slate-700 uppercase tracking-wider block">
                        {ev.type}
                      </span>
                      <p className="text-slate-600 text-[11px]">
                        {ev.actor?.name ? `By ${ev.actor.name}` : 'System'}
                      </p>
                      <span className="text-[10px] text-slate-400">{formatTimeAgo(ev.createdAt)}</span>
                    </div>
                  ))}
                  {(!crmData?.contact?.conversation?.events || crmData.contact.conversation.events.length === 0) && (
                    <p className="text-xs text-slate-400 text-center py-4">No activity events recorded yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
