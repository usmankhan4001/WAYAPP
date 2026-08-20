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
  Camera,
  X,
  Download,
  ExternalLink,
  MapPin,
  Loader2,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { InfoTooltip, Tooltip } from '@/components/ui/Tooltip';
import { AudioVoicePlayer } from './AudioVoicePlayer';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';
import { MediaLightbox } from './MediaLightbox';
import { playOutgoingPop } from '@/lib/notifications/sound';

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
  const [isMockMode, setIsMockMode] = useState(false);
  const [isSimulatingInbound, setIsSimulatingInbound] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputTypeRef = useRef<'image' | 'video' | 'audio' | 'document'>('image');
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const isAtBottomRef = useRef(true);
  const prevMessagesCountRef = useRef(0);

  // 24h Window Calculation
  const lastInteraction = contact?.lastInteractionAt ? new Date(contact.lastInteractionAt).getTime() : null;
  const msSinceLast = lastInteraction ? Date.now() - lastInteraction : Infinity;
  const msRemaining = Math.max(0, 24 * 60 * 60 * 1000 - msSinceLast);
  const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const isWindowActive = msRemaining > 0;
  const effectiveWindowActive = isMockMode || isWindowActive;

  const fetchSettings = () => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.isMockMode) setIsMockMode(true);
      })
      .catch(() => {});
  };

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

  const scrollToBottom = (force = false) => {
    if (messagesContainerRef.current) {
      if (force || isAtBottomRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }
  };

  const handleContainerScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
  };

  useEffect(() => {
    fetchSettings();
    fetchMessages();
    fetchTemplates();
    const interval = setInterval(fetchMessages, 2500);
    return () => clearInterval(interval);
  }, [contact?.id]);

  useEffect(() => {
    // Scroll only on initial load or new message arriving
    if (messages.length > prevMessagesCountRef.current) {
      scrollToBottom(prevMessagesCountRef.current === 0);
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages]);

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
      // 1. Upload media to server
      const formData = new FormData();
      formData.append('file', stagedMedia.file);

      const uploadRes = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || uploadData.error) {
        throw new Error(uploadData.error || 'Failed to upload media attachment');
      }

      // 2. Dispatch via chat API
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          mediaUrl: uploadData.url,
          mediaType: stagedMedia.mediaType,
          caption: stagedMedia.caption.trim() || undefined,
          filename: uploadData.filename,
        }),
      });

      const chatData = await chatRes.json();
      if (!chatRes.ok || chatData.error) {
        throw new Error(chatData.error || 'Failed to send WhatsApp media message');
      }

      setStagedMedia(null);
      playOutgoingPop();
      fetchMessages();
      onRefreshList();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendVoiceNote = async (voiceFile: File) => {
    if (!contact?.id) return;

    setIsSending(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', voiceFile);

      const uploadRes = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || uploadData.error) {
        throw new Error(uploadData.error || 'Failed to upload voice note');
      }

      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          mediaUrl: uploadData.url,
          mediaType: 'audio',
          caption: 'Voice note',
        }),
      });

      const chatData = await chatRes.json();
      if (!chatRes.ok || chatData.error) {
        throw new Error(chatData.error || 'Failed to send WhatsApp voice note');
      }

      setIsRecordingVoice(false);
      playOutgoingPop();
      fetchMessages();
      onRefreshList();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSending(false);
    }
  };

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
        if (data.requiresTemplate) {
          setIsTemplatePickerOpen(true);
        }
      } else {
        setText('');
        playOutgoingPop();
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
        playOutgoingPop();
        fetchMessages();
        onRefreshList();
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSimulateInbound = async () => {
    if (!contact?.id) return;
    setIsSimulatingInbound(true);
    try {
      const promptText = window.prompt(
        `Simulate Incoming WhatsApp Message from ${contactName}:`,
        'Hi, I received your message! How can I proceed?'
      );
      if (!promptText || !promptText.trim()) {
        setIsSimulatingInbound(false);
        return;
      }
      const res = await fetch('/api/chat/simulate-inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          text: promptText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to simulate inbound message');
      }
      fetchMessages();
      onRefreshList();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSimulatingInbound(false);
    }
  };

  const contactName = `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim() || 'Customer';

  return (
    <div className="flex-1 h-full w-full flex bg-slate-950 overflow-hidden min-w-0">
      {/* Hidden Global File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelected(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />

      {/* Hidden Camera Capture Input */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelected(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />

      {/* Lightbox Modal */}
      {lightboxMedia && (
        <MediaLightbox
          mediaUrl={lightboxMedia.url}
          mediaType={lightboxMedia.type}
          caption={lightboxMedia.caption}
          onClose={() => setLightboxMedia(null)}
        />
      )}

      {/* Main Chat Thread */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800/80">
        {/* Chat Top Bar */}
        <div className="h-16 px-4 md:px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {onBackMobile && (
              <button
                type="button"
                onClick={onBackMobile}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm ring-1 ring-emerald-500/30">
              {contactName.substring(0, 2).toUpperCase()}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 truncate">{contactName}</h3>
                <span className="text-[10px] font-mono text-slate-400 font-medium">
                  {contact?.phoneNumber}
                </span>
              </div>

              {/* 24-Hour Active Window Pill */}
              <div className="flex items-center gap-1.5">
                {effectiveWindowActive ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {isMockMode ? 'Mock Simulation Active' : `24h Active • ${hoursRemaining}h ${minutesRemaining}m`}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded-full">
                    <Lock className="w-2.5 h-2.5" />
                    24h Expired &bull; Template Required
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateInbound}
              disabled={isSimulatingInbound}
              className="px-3 py-1.5 rounded-xl border border-dashed border-emerald-700/80 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
              title="Simulate incoming customer message to test two-way communication"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{isSimulatingInbound ? 'Simulating...' : 'Simulate Reply'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsTemplatePickerOpen(!isTemplatePickerOpen)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Templates</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold text-rose-900 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Chat Messages Timeline */}
        <div
          ref={messagesContainerRef}
          onScroll={handleContainerScroll}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileSelected(e.dataTransfer.files[0]);
            }
          }}
          className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-3.5 bg-[#efeae2]/90 relative ${
            isDragging ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-50/50' : ''
          }`}
        >
          {isDragging && (
            <div className="absolute inset-0 bg-emerald-50/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-emerald-700 pointer-events-none">
              <ImageIcon className="w-12 h-12 mb-2 animate-bounce" />
              <p className="text-sm font-bold">Drop your image, video, or PDF file to attach</p>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-white/80 border border-slate-200/80 flex items-center justify-center shadow-sm">
                <Sparkles className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-xs font-bold text-slate-700">No messages yet in this conversation</p>
              <p className="text-[11px] text-slate-500 max-w-xs">
                Send an approved WhatsApp template or reply directly to begin chatting.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isOutbound = m.direction === 'OUTBOUND';
              const msgType = (m.messageType || 'text').toLowerCase();
              const hasMedia = Boolean(m.mediaUrl);

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] sm:max-w-[75%] md:max-w-[65%] rounded-2xl p-3 md:p-3.5 shadow-sm space-y-1.5 transition-all ${
                      isOutbound
                        ? 'bg-[#d9fdd3] text-slate-900 border border-[#c3f4bb] rounded-tr-xs ml-auto'
                        : 'bg-white text-slate-900 border border-slate-200/90 rounded-tl-xs mr-auto'
                    }`}
                  >
                    {/* Media Type: Image */}
                    {msgType === 'image' && hasMedia && (
                      <div
                        onClick={() =>
                          setLightboxMedia({
                            url: m.mediaUrl,
                            type: 'image',
                            caption: m.body !== 'Photo' ? m.body : undefined,
                          })
                        }
                        className="cursor-pointer overflow-hidden rounded-xl bg-slate-950/10 group relative border border-black/5"
                      >
                        <img
                          src={m.mediaUrl}
                          alt="WhatsApp Image"
                          className="max-h-64 w-full object-cover rounded-xl group-hover:scale-102 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <ExternalLink className="w-5 h-5" />
                        </div>
                      </div>
                    )}

                    {/* Media Type: Video */}
                    {msgType === 'video' && hasMedia && (
                      <div className="overflow-hidden rounded-xl bg-black max-h-64 border border-black/10">
                        <video
                          src={m.mediaUrl}
                          controls
                          className="w-full max-h-64 rounded-xl"
                        />
                      </div>
                    )}

                    {/* Media Type: Audio / Voice Note */}
                    {(msgType === 'audio' || msgType === 'voice') && hasMedia && (
                      <AudioVoicePlayer src={m.mediaUrl} isOutbound={isOutbound} />
                    )}

                    {/* Media Type: Document / PDF */}
                    {msgType === 'document' && hasMedia && (
                      <div
                        className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                          isOutbound
                            ? 'bg-[#c3f4bb]/70 border-[#b2e8a9] text-slate-900'
                            : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      >
                        <FileIcon className="w-8 h-8 text-rose-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate">
                            {m.body && m.body !== 'Document' ? m.body : 'Attached Document'}
                          </p>
                          <p className="text-[10px] opacity-70">PDF / Document File</p>
                        </div>
                        <a
                          href={m.mediaUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`p-2 rounded-lg transition-all ${
                            isOutbound
                              ? 'bg-[#005c4b] hover:bg-[#004739] text-white shadow-sm'
                              : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                          }`}
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    )}

                    {/* Media Type: Location */}
                    {msgType === 'location' && (
                      <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
                        <MapPin className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div className="text-xs font-medium">{m.body}</div>
                      </div>
                    )}

                    {/* Text Body / Caption */}
                    {m.body &&
                      msgType !== 'audio' &&
                      msgType !== 'voice' &&
                      (msgType !== 'image' || m.body !== 'Photo') &&
                      (msgType !== 'video' || m.body !== 'Video') &&
                      (msgType !== 'document' || !hasMedia) &&
                      msgType !== 'location' && (
                        <p className="text-[13px] whitespace-pre-wrap leading-relaxed font-sans text-slate-900">
                          {m.body}
                        </p>
                      )}

                    {/* Message Timestamp & Status */}
                    <div
                      className={`flex items-center justify-end gap-1 text-[10px] select-none pt-0.5 ${
                        isOutbound ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      <span className="font-mono text-[10px]">{formatDateTime(m.timestamp)}</span>
                      {isOutbound && (
                        <CheckCheck
                          className={`w-3.5 h-3.5 ${
                            m.status === 'READ'
                              ? 'text-[#53bdeb] font-bold'
                              : m.status === 'DELIVERED'
                              ? 'text-slate-500'
                              : 'text-slate-400'
                          }`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Bar or Window Expired Template Trigger */}
        <div className="p-3 md:p-4 bg-slate-50 border-t border-slate-200 relative shrink-0">
          {/* Staged Media Preview Drawer */}
          {stagedMedia && (
            <div className="mb-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom duration-200">
              <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
                {stagedMedia.mediaType === 'image' ? (
                  <img
                    src={stagedMedia.previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : stagedMedia.mediaType === 'video' ? (
                  <Video className="w-6 h-6 text-emerald-600" />
                ) : stagedMedia.mediaType === 'audio' ? (
                  <Music className="w-6 h-6 text-emerald-600" />
                ) : (
                  <FileIcon className="w-6 h-6 text-rose-500" />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {stagedMedia.file.name}
                </p>
                <input
                  type="text"
                  placeholder="Add a caption..."
                  value={stagedMedia.caption}
                  onChange={(e) =>
                    setStagedMedia({ ...stagedMedia, caption: e.target.value })
                  }
                  className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setStagedMedia(null)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  title="Cancel attachment"
                >
                  <X className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleSendStagedMedia}
                  disabled={isSending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Media</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Informational banner if window is expired */}
          {!effectiveWindowActive && (
            <div className="mb-2 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-amber-800 text-[11px] truncate">
                  24h Window Inactive: May require an approved WhatsApp template.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplatePickerOpen(!isTemplatePickerOpen)}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold shrink-0 flex items-center gap-1 shadow-sm"
              >
                <FileText className="w-3 h-3" />
                <span>Templates</span>
              </button>
            </div>
          )}

          {/* Voice Recorder Overlay or Active Input Bar */}
          {isRecordingVoice ? (
            <VoiceNoteRecorder
              onSendVoiceNote={handleSendVoiceNote}
              onCancel={() => setIsRecordingVoice(false)}
            />
          ) : (
            <div className="relative">
              {/* Attachment Popover Menu */}
              {isAttachmentMenuOpen && (
                <div className="absolute bottom-14 left-0 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-2 z-30 grid grid-cols-2 gap-1.5 min-w-[240px] animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAttachmentMenuOpen(false);
                      cameraInputRef.current?.click();
                    }}
                    className="p-2 rounded-xl hover:bg-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-200 transition-all col-span-2 bg-emerald-950/40 border border-emerald-800/60"
                  >
                    <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-sm">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-white">Take Photo / Video</span>
                      <span className="text-[10px] text-slate-400 block">Capture from camera</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerFileInput('image')}
                    className="p-2 rounded-xl hover:bg-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-200 transition-all"
                  >
                    <div className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <span>Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerFileInput('video')}
                    className="p-2 rounded-xl hover:bg-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-200 transition-all"
                  >
                    <div className="p-1.5 rounded-lg bg-blue-950 text-blue-400 border border-blue-800/60">
                      <Video className="w-4 h-4" />
                    </div>
                    <span>Video</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerFileInput('document')}
                    className="p-2 rounded-xl hover:bg-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-200 transition-all"
                  >
                    <div className="p-1.5 rounded-lg bg-purple-950 text-purple-400 border border-purple-800/60">
                      <FileIcon className="w-4 h-4" />
                    </div>
                    <span>Document</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerFileInput('audio')}
                    className="p-2 rounded-xl hover:bg-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-200 transition-all"
                  >
                    <div className="p-1.5 rounded-lg bg-amber-950 text-amber-400 border border-amber-800/60">
                      <Music className="w-4 h-4" />
                    </div>
                    <span>Audio</span>
                  </button>
                </div>
              )}

              <form onSubmit={handleSend} className="flex items-center gap-1.5 sm:gap-2">
                {/* Paperclip Button */}
                <button
                  type="button"
                  onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                  className={`p-2 sm:p-2.5 rounded-xl shrink-0 transition-all ${
                    isAttachmentMenuOpen
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Attach media"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Quick Camera Snap */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-all shrink-0"
                  title="Take photo from camera"
                >
                  <Camera className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  placeholder="Type your WhatsApp reply..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="flex-1 min-w-0 px-3.5 py-2 sm:py-2.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />

                {/* Voice Note Button */}
                {!text.trim() && (
                  <button
                    type="button"
                    onClick={() => setIsRecordingVoice(true)}
                    className="p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-all shrink-0"
                    title="Record WhatsApp voice note"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSending || !text.trim()}
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all disabled:opacity-50 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </div>
          )}

          {/* Quick Template Picker Drawer */}
          {isTemplatePickerOpen && (
            <div className="mt-3 p-3.5 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Select Approved WhatsApp Template</span>
                <button
                  onClick={() => setIsTemplatePickerOpen(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>

              {templates.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">
                  No approved templates found. Create or sync templates in the Templates tab.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-emerald-500/80 hover:bg-emerald-950/20 flex items-center justify-between gap-2 cursor-pointer transition-all"
                      onClick={() => handleSendTemplate(tpl)}
                    >
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-white font-mono">{tpl.name}</h5>
                        <p className="text-[10px] text-slate-400 truncate">{tpl.category} &bull; {tpl.language}</p>
                      </div>
                      <button
                        type="button"
                        disabled={isSending}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shrink-0"
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
      <div className="w-64 bg-slate-900 border-l border-slate-800/80 p-4 overflow-y-auto space-y-4 hidden xl:block shrink-0">
        <div className="text-center pb-3 border-b border-slate-800">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-bold text-base flex items-center justify-center mx-auto mb-2 shadow-sm ring-1 ring-emerald-500/30">
            {contactName.substring(0, 2).toUpperCase()}
          </div>
          <h4 className="text-xs font-bold text-white">{contactName}</h4>
          <p className="text-[11px] text-slate-400 font-mono">{contact?.phoneNumber}</p>
        </div>

        {/* Groups */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Groups</span>
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
