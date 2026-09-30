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
  Copy,
  Forward,
  Edit2,
  Search,
  Check,
  Star,
  MoreVertical,
} from 'lucide-react';
import { formatDateTime, formatTimeAgo } from '@/lib/utils';
import { LEAD_STAGES, getLeadStage } from '@/lib/constants/lead-stages';
import { InfoTooltip, Tooltip } from '@/components/ui/Tooltip';
import { StatusBadge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { UserAvatar } from '@/components/ui/avatar';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { parseReactions } from '@/lib/whatsapp/reactions';
import { MessageMenu, bubbleGestures, newGestureState } from './MessageMenu';
import { AttachSheet } from './AttachSheet';
import { dayLabel, messagePreview, replyStatusLine, sameDay, tickState, timeLabel } from './chat-utils';
import { Input } from '@/components/ui/input';
import { AudioVoicePlayer } from './AudioVoicePlayer';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';
import { MediaLightbox } from './MediaLightbox';
import { playOutgoingPop } from '@/lib/notifications/sound';
import { useLiveRefresh, ReconnectingBanner } from './useLiveRefresh';

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
  const toast = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [menuMessage, setMenuMessage] = useState<any | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [noteMode, setNoteMode] = useState(false);
  const [isAttachSheetOpen, setIsAttachSheetOpen] = useState(false);
  const [isStarredOpen, setIsStarredOpen] = useState(false);
  const [starredMessages, setStarredMessages] = useState<any[]>([]);
  const gestureState = useRef(newGestureState());
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

  // Message Actions State
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageText, setEditMessageText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<any | null>(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [forwardContacts, setForwardContacts] = useState<any[]>([]);
  const [forwardSearch, setForwardSearch] = useState('');
  const [isForwarding, setIsForwarding] = useState(false);

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
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputTypeRef = useRef<'image' | 'video' | 'audio' | 'document'>('image');
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const isAtBottomRef = useRef(true);
  const prevMessagesCountRef = useRef(0);

  // 24h window: the server works out the expiry from the customer's latest inbound message
  // (GET /api/chat sends it in X-Reply-Window-Expires-At). We only count down to it here.
  const [windowExpiresAt, setWindowExpiresAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const msRemaining = windowExpiresAt ? Math.max(0, windowExpiresAt - nowTick) : 0;
  const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const isWindowActive = msRemaining > 0;
  const effectiveWindowActive = isWindowActive;

  const fetchSettings = () => {};

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

  const handleCopyMessage = (body: string) => {
    if (!body) return;
    navigator.clipboard.writeText(body);
  };

  const handleOpenForward = (msg: any) => {
    setForwardingMessage(msg);
    setIsForwardModalOpen(true);
    setForwardSearch('');
    // Initial fetch of recent contacts to forward to
    fetch('/api/chat?limit=5')
      .then((res) => res.json())
      .then((data) => {
        if (data.conversations) {
          setForwardContacts(data.conversations.map((c: any) => c.contact).filter(Boolean));
        }
      })
      .catch(() => {});
  };

  const handleSearchContactsForForward = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForwardSearch(val);
    fetch(`/api/chat?search=${encodeURIComponent(val)}&limit=10`)
      .then((res) => res.json())
      .then((data) => {
        if (data.conversations) {
          setForwardContacts(data.conversations.map((c: any) => c.contact).filter(Boolean));
        }
      })
      .catch(() => {});
  };

  const handleForwardSubmit = async (targetContactId: string) => {
    if (!targetContactId || !forwardingMessage) return;
    setIsForwarding(true);
    try {
      const msgType = forwardingMessage.messageType || 'text';
      const isMedia = msgType === 'image' || msgType === 'video' || msgType === 'audio' || msgType === 'document' || msgType === 'voice';
      
      const payload: any = {
        contactId: targetContactId,
      };

      if (isMedia) {
        payload.mediaType = msgType === 'voice' ? 'audio' : msgType;
        payload.mediaUrl = forwardingMessage.mediaUrl;
        payload.caption = forwardingMessage.body;
      } else {
        payload.text = forwardingMessage.body;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIsForwardModalOpen(false);
        setForwardingMessage(null);
      } else {
        const data = await res.json();
        toast.error("Forward failed", data.error);
      }
    } catch (err: any) {
      toast.error("Error forwarding message", err?.message);
    } finally {
      setIsForwarding(false);
    }
  };

  const handleEditSubmit = async (msgId: string) => {
    if (!editMessageText.trim()) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/chat/message/${msgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: editMessageText }),
      });
      if (res.ok) {
        setEditingMessageId(null);
        fetchMessages();
      } else {
        const data = await res.json();
        toast.error("Edit failed", data.error);
      }
    } catch (err: any) {
      toast.error("Error editing message", err?.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Rejects on failure so useLiveRefresh can back off and show the "Reconnecting..." banner.
  const loadMessages = async () => {
    if (!contact?.id) return;
    const res = await fetch(`/api/chat?contactId=${contact.id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setMessages(Array.isArray(data) ? data : []);
    const exp = res.headers.get('X-Reply-Window-Expires-At');
    setWindowExpiresAt(exp ? new Date(exp).getTime() : null);
    setNowTick(Date.now());
  };
  const fetchMessages = () => {
    loadMessages().catch(() => {});
  };
  const { offline } = useLiveRefresh(loadMessages, { contactId: contact?.id });

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
    setWindowExpiresAt(null);
    fetchTemplates();
    fetchSnippets();
    fetchCrmData();
    setAiSuggestions([]);
    setSummaryText(null);
  }, [contact?.id]);

  useEffect(() => {
    // Scroll only on initial load or new message arriving
    if (messages.length > prevMessagesCountRef.current) {
      scrollToBottom(prevMessagesCountRef.current === 0);
    }
    prevMessagesCountRef.current = messages.length;
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
    const paymentMsg = `💳 *Invoice for ${invoiceItem}*\nTotal Amount: $${invoiceAmount}\nPlease complete your secure checkout here: https://pay.example.com/inv-${Date.now().toString().slice(-6)}\nThank you! ✨`;
    setText(paymentMsg);
    setIsInvoiceModalOpen(false);
    textInputRef.current?.focus();
  };

  const handleInsertMeetingLink = () => {
    const meetMsg = `📅 *Schedule a 1-on-1 Consultation*\nYou can pick a convenient 15-minute slot on our team calendar here: https://calendly.com/your-company/consultation\nLooking forward to speaking with you! 🚀`;
    setText(meetMsg);
    textInputRef.current?.focus();
  };

  const handleInsertCatalogLink = () => {
    const catalogMsg = `📄 *Official Product Catalog & Pricing*\nYou can view our complete product catalog and latest offers here: https://example.com/catalog.pdf\nLet me know if you have any questions! 😊`;
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
      playOutgoingPop();
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

      setIsRecordingVoice(false);
      playOutgoingPop();
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
      // A note goes to /api/chat/internal-notes, which cannot reach WhatsApp at all.
      const res = noteMode
        ? await fetch('/api/chat/internal-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contactId: contact.id, body: text.trim() }),
          })
        : await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contactId: contact.id,
              messageType: 'text',
              text: text.trim(),
              replyToWamid: replyingTo?.wamid || undefined,
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
        setReplyingTo(null);
        setNoteMode(false);
        if (!noteMode) playOutgoingPop();
        fetchMessages();
        onRefreshList();
      }
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
      setErrorMessage(err.message || 'Error dispatching template.');
    } finally {
      setIsSending(false);
    }
  };

  const patchMessage = (id: string, patch: Record<string, any>) =>
    setMessages((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const handleReplyTo = (m: any) => {
    setNoteMode(false);
    setReplyingTo(m);
    textInputRef.current?.focus();
  };

  const handleStar = async (m: any) => {
    const next = !m.starred;
    patchMessage(m.id, { starred: next });
    try {
      const res = await fetch(`/api/chat/messages/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred: next }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      patchMessage(m.id, { starred: !next });
      setErrorMessage('Could not star the message. Try again.');
    }
  };

  const handleReact = async (m: any, emoji: string) => {
    const before = m.reactions;
    const others = parseReactions(m.reactions).filter((r) => r.from === 'customer');
    patchMessage(m.id, { reactions: JSON.stringify(emoji ? [...others, { emoji, from: 'me' }] : others) });
    try {
      const res = await fetch(`/api/chat/messages/${m.id}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) throw new Error('failed');
      fetchMessages();
    } catch {
      patchMessage(m.id, { reactions: before });
      setErrorMessage('Could not send the reaction. Try again.');
    }
  };

  const openStarred = () => {
    setIsStarredOpen(true);
    fetch(`/api/chat?contactId=${contact.id}&starred=1`)
      .then((res) => res.json())
      .then((data) => setStarredMessages(Array.isArray(data) ? data : []))
      .catch(() => setStarredMessages([]));
  };

  const openSavedReplies = () => {
    setNoteMode(false);
    setText('/');
    setShowSnippetDropdown(true);
    setSnippetFilter('/');
    setTimeout(() => textInputRef.current?.focus(), 0);
  };

  const contactName = `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim() || contact?.phoneNumber || 'Customer';
  const currentStage = getLeadStage(leadStage);

  return (
    <div className="relative flex-1 h-full w-full flex bg-chat-canvas overflow-hidden min-w-0">
      <ReconnectingBanner show={offline} />
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

      {/* Lightbox */}
      {lightboxMedia && (
        <MediaLightbox
          mediaUrl={lightboxMedia.url}
          mediaType={lightboxMedia.type}
          caption={lightboxMedia.caption}
          onClose={() => setLightboxMedia(null)}
        />
      )}

      {/* Main Chat Thread */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border">
        {/* Chat Top Bar */}
        <div className="h-16 px-4 md:px-6 bg-card/95 backdrop-blur-md border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {onBackMobile && (
              <button
                onClick={onBackMobile}
                className="md:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Back to chat list"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            <UserAvatar name={contactName} size="lg" />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground truncate">{contactName}</h3>
                {modules.lead_crm && (
                  <StatusBadge tone={currentStage.tone}>{currentStage.label}</StatusBadge>
                )}
              </div>
              <p className="truncate text-sm text-muted-foreground">{replyStatusLine(effectiveWindowActive)}</p>
            </div>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center gap-2">
            <IconButton label="Starred messages" onClick={openStarred}>
              <Star />
            </IconButton>
            <button
              type="button"
              onClick={() => setIsTemplatePickerOpen(!isTemplatePickerOpen)}
              className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-accent text-foreground text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
            >
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Templates</span>
            </button>

            {/* AI Summarize Chat Button */}
            {modules.ai_copilot && (
              <button
                onClick={handleAiSummarize}
                disabled={isSummarizing}
                title="Generate 3-bullet AI chat summary"
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 flex items-center gap-1 shadow-2xs transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden md:inline">{isSummarizing ? 'Summarizing...' : 'Summarize'}</span>
              </button>
            )}
          </div>
        </div>

        {/* AI Summary Banner (if active) */}
        {summaryText && (
          <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-purple-50/90 border border-purple-200 shadow-xs relative animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>AI Sales Handover Summary</span>
              </div>
              <button onClick={() => setSummaryText(null)} className="text-purple-400 hover:text-purple-700 p-1 rounded-lg" aria-label="Dismiss AI summary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="text-xs text-purple-800 font-sans whitespace-pre-wrap leading-relaxed">
              {summaryText}
            </pre>
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
          className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-3.5 bg-chat-canvas/90 relative ${
            isDragging ? 'ring-2 ring-ring ring-inset bg-black/5' : ''
          }`}
        >
          {isDragging && (
            <div className="absolute inset-0 bg-black/5 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-foreground pointer-events-none">
              <ImageIcon className="w-12 h-12 mb-2 animate-bounce" />
              <p className="text-sm font-normal">Drop your image, video, or PDF file to attach</p>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground space-y-2">
              <div className="w-12 h-12 rounded-full bg-card/80 border border-border flex items-center justify-center ">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <p className="text-xs font-normal text-foreground">No messages yet in this conversation</p>
              <p className="text-2xs text-muted-foreground max-w-xs">
                Send an approved WhatsApp template or reply directly to begin chatting.
              </p>
            </div>
          ) : (
            messages.map((m, idx) => {
              const isOutbound = m.direction === 'OUTBOUND';
              const hasMedia = !!m.mediaUrl;
              const msgType = m.messageType || 'text';
              const when = new Date(m.timestamp);
              const showDay = idx === 0 || !sameDay(new Date(messages[idx - 1].timestamp), when);
              const dayChip = showDay ? (
                <div className="flex justify-center py-1">
                  <span className="rounded-full bg-raised px-3 py-1 text-xs font-medium text-muted-foreground">{dayLabel(when)}</span>
                </div>
              ) : null;
              const quoted = m.replyToWamid ? messages.find((x) => x.wamid === m.replyToWamid) : null;
              const reactionList = parseReactions(m.reactions);
              const reactionGroups = Object.entries(
                reactionList.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.emoji]: (acc[r.emoji] || 0) + 1 }), {})
              );

              // Internal note: team-only, never sent to WhatsApp, styled apart from customer bubbles.
              if (m.direction === 'INTERNAL') {
                return (
                  <React.Fragment key={m.id}>
                    {dayChip}
                    <div className="flex justify-center" {...bubbleGestures(gestureState.current, () => setMenuMessage(m), () => {})}>
                      <div className="w-full max-w-md rounded-2xl border border-dashed border-warning bg-warning-subtle px-3.5 py-2.5 text-warning-subtle-foreground">
                        <p className="flex items-center gap-1.5 text-xs font-semibold">
                          <Lock className="size-3.5" />
                          Only your team sees this
                        </p>
                        <p className="whitespace-pre-wrap pt-1 text-sm">{m.body}</p>
                        <p className="pt-1 text-right text-xs opacity-70">{timeLabel(when)}</p>
                      </div>
                    </div>
                  </React.Fragment>
                );
              }

              return (
                <React.Fragment key={m.id}>
                {dayChip}
                <div
                  className={`flex flex-col group/msg ${isOutbound ? 'items-end' : 'items-start'}`}
                  onMouseEnter={() => setHoveredMessageId(m.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  <div className={`flex items-center gap-2 max-w-full ${isOutbound ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div
                      {...bubbleGestures(gestureState.current, () => setMenuMessage(m), () => handleReplyTo(m))}
                      className={`max-w-[88%] sm:max-w-[75%] md:max-w-[65%] p-3 md:p-3.5 space-y-1.5 transition-all relative cursor-pointer sm:cursor-default shadow-2xs select-text ${
                        isOutbound
                          ? 'bg-wa-bubble-out text-wa-bubble-out-foreground rounded-[var(--radius-bubble)] rounded-tr-[var(--radius-bubble-tail)]'
                          : 'bg-wa-bubble-in text-wa-bubble-in-foreground rounded-[var(--radius-bubble)] rounded-tl-[var(--radius-bubble-tail)]'
                      }`}
                    >
                      {m.replyToWamid && (
                        <div className="rounded-lg border-l-4 border-primary bg-foreground/5 px-2.5 py-1.5">
                          <p className="text-xs font-semibold text-foreground">
                            {quoted ? (quoted.direction === 'OUTBOUND' ? 'You' : contactName) : 'Original message'}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">{messagePreview(quoted)}</p>
                        </div>
                      )}
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
                          className="cursor-pointer overflow-hidden rounded-xl bg-foreground/5 group relative border border-black/5"
                        >
                          <img
                            src={m.mediaUrl}
                            alt="WhatsApp Image"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
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
                              ? 'bg-[#c3f4bb]/70 border-[#b2e8a9] text-foreground'
                              : 'bg-muted border-border text-foreground'
                          }`}
                        >
                          <FileIcon className="w-8 h-8 text-rose-500 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate">
                              {m.body && m.body !== 'Document' ? m.body : 'Attached Document'}
                            </p>
                            <p className="text-2xs text-muted-foreground">PDF / Document File</p>
                          </div>
                          <a
                            href={m.mediaUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`p-2 rounded-lg transition-all ${
                              isOutbound
                                ? 'bg-primary hover:bg-primary/90 text-white shadow-2xs'
                                : 'bg-muted hover:bg-accent text-foreground'
                            }`}
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      )}

                      {/* Media Type: Location */}
                      {msgType === 'location' && (
                        <div className="flex items-start gap-2.5 p-2 rounded-full bg-muted text-foreground border border-border">
                          <MapPin className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                          <div className="text-xs font-medium">{m.body}</div>
                        </div>
                      )}

                      {/* Text Body / Caption */}
                      {editingMessageId === m.id ? (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <textarea
                            value={editMessageText}
                            onChange={(e) => setEditMessageText(e.target.value)}
                            className="w-full text-sm rounded-full p-2 border border-emerald-400 bg-card text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring resize-none min-h-[60px]"
                            autoFocus
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setEditingMessageId(null)}
                              className="px-2 py-1 text-2xs font-normal rounded bg-muted hover:bg-accent text-foreground"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleEditSubmit(m.id)}
                              disabled={isSavingEdit}
                              className="px-2 py-1 text-2xs font-normal rounded bg-wa hover:bg-primary/90 text-white"
                            >
                              {isSavingEdit ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        m.body &&
                        msgType !== 'audio' &&
                        msgType !== 'voice' &&
                        (msgType !== 'image' || m.body !== 'Photo') &&
                        (msgType !== 'video' || m.body !== 'Video') &&
                        (msgType !== 'document' || !hasMedia) &&
                        msgType !== 'location' && (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed font-sans text-foreground">
                            {m.body}
                          </p>
                        )
                      )}

                      {/* Message Timestamp & Status */}
                      <div className="flex items-center justify-end gap-1 pt-0.5 text-xs text-muted-foreground select-none">
                        {m.starred && <Star className="size-3 fill-current" aria-label="Starred" />}
                        <span>{timeLabel(when)}</span>
                        {isOutbound &&
                          (tickState(m.status) === 'sent' ? (
                            <Check className="size-3.5" aria-label="Sent" />
                          ) : (
                            <CheckCheck
                              className={`size-3.5 ${tickState(m.status) === 'read' ? 'text-read-tick' : ''}`}
                              aria-label={tickState(m.status) === 'read' ? 'Read' : 'Delivered'}
                            />
                          ))}
                      </div>
                    </div>

                    {/* Message options: the same menu as long-press */}
                    <IconButton
                      label="Message options"
                      size="sm"
                      className="hidden shrink-0 md:inline-flex md:opacity-0 md:group-hover/msg:opacity-100 md:focus-visible:opacity-100"
                      onClick={() => setMenuMessage(m)}
                    >
                      <MoreVertical />
                    </IconButton>
                  </div>
                  {reactionGroups.length > 0 && (
                    <div className={`-mt-2 flex gap-1 px-2 ${isOutbound ? 'justify-end' : ''}`}>
                      {reactionGroups.map(([emoji, n]) => (
                        <span key={emoji} className="rounded-full border border-border bg-card px-2 py-0.5 text-sm">
                          {emoji}
                          {n > 1 && <span className="pl-1 text-xs text-muted-foreground">{n}</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mx-4 mb-2 p-2.5 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700" aria-label="Dismiss error message">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* AI Reply Suggestions Pills */}
        {modules.ai_copilot && aiSuggestions.length > 0 && (
          <div className="mx-4 mb-2 p-2.5 rounded-full bg-purple-50/90 border border-purple-200 space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-normal text-purple-900 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>AI Suggested Sales Replies (1-Click to Insert):</span>
              </span>
              <button onClick={() => setAiSuggestions([])} className="text-purple-400 hover:text-purple-700" aria-label="Dismiss AI suggestions">
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
                  className="p-2 text-left rounded-full bg-card hover:bg-purple-100/50 border border-purple-200 text-xs text-foreground transition-all font-medium"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sales Action Bar & AI Co-Pilot Toolbar */}
        <div className="px-4 py-1.5 bg-muted border-t border-border flex items-center justify-between gap-2 overflow-x-auto">
          {/* Left: 1-Click Sales Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {modules.canned_snippets && (
              <>
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(true)}
                  className="px-2.5 py-1 rounded-full text-xs font-normal bg-card border border-border hover:border-emerald-500 hover:text-foreground text-foreground flex items-center gap-1 shadow-2xs transition-all"
                >
                  <CreditCard className="w-3.5 h-3.5 text-primary" />
                  <span>Send Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={handleInsertCatalogLink}
                  className="px-2.5 py-1 rounded-full text-xs font-normal bg-card border border-border hover:border-blue-500 hover:text-blue-700 text-foreground flex items-center gap-1 shadow-2xs transition-all"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                  <span>Catalog</span>
                </button>

                <button
                  type="button"
                  onClick={handleInsertMeetingLink}
                  className="px-2.5 py-1 rounded-full text-xs font-normal bg-card border border-border hover:border-purple-500 hover:text-purple-700 text-foreground flex items-center gap-1 shadow-2xs transition-all"
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
                className="px-2.5 py-1 rounded-full text-xs font-normal bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center gap-1 shadow-xs transition-all disabled:opacity-50"
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
                    className="px-2 py-1 rounded-full text-xs font-normal bg-card border border-border hover:bg-black/5 text-foreground flex items-center gap-1 transition-all"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>Polish</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAiTranslate}
                    disabled={isAiLoading}
                    title={`Translate to ${targetLang}`}
                    className="px-2 py-1 rounded-full text-xs font-normal bg-card border border-border hover:bg-black/5 text-foreground flex items-center gap-1 transition-all"
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
        <div className="p-3 bg-card border-t border-border relative">
          {/* Canned Snippet Suggestions Autocomplete Drawer */}
          {showSnippetDropdown && (
            <div className="absolute bottom-16 left-4 right-4 bg-card rounded-2xl border border-border shadow-xl p-2.5 z-40 max-h-56 overflow-y-auto space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="px-2 py-1 text-2xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Canned Snippets (Type shortcut or click to insert)</span>
                <span className="text-2xs text-muted-foreground">Esc to close</span>
              </div>
              {snippets
                .filter((s) => s.shortcut.toLowerCase().includes(snippetFilter))
                .map((snip) => (
                  <div
                    key={snip.id}
                    onClick={() => handleSelectSnippet(snip)}
                    className="p-2 rounded-xl hover:bg-accent hover:border-emerald-200 border border-transparent flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-xs text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80">
                          {snip.shortcut}
                        </span>
                        <span className="font-semibold text-xs text-foreground truncate">{snip.title}</span>
                      </div>
                      <p className="text-2xs text-muted-foreground truncate mt-0.5">{snip.content}</p>
                    </div>
                    <span className="text-2xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                      {snip.category}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {/* Staged Media Preview */}
          {stagedMedia && (
            <div className="mb-2 p-2 rounded-xl bg-muted border border-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {stagedMedia.mediaType === 'image' && (
                  <img src={stagedMedia.previewUrl} className="w-10 h-10 object-cover rounded-lg shadow-2xs" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{stagedMedia.file.name}</p>
                  <span className="text-2xs text-muted-foreground uppercase font-semibold">{stagedMedia.mediaType}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStagedMedia(null)}
                  className="p-1.5 text-muted-foreground hover:text-muted-foreground rounded-lg hover:bg-accent"
                  aria-label="Remove attachment"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleSendStagedMedia}
                  disabled={isSending}
                  className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 active:scale-95 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs transition-all"
                >
                  {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Send Media</span>
                </button>
              </div>
            </div>
          )}

          {/* Informational banner if window is expired */}
          {!effectiveWindowActive && (
            <div className="mb-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-amber-800 text-2xs font-medium truncate">
                  This customer has not written in 24 hours. Use a template to reply.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplatePickerOpen(!isTemplatePickerOpen)}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-2xs font-semibold shrink-0 flex items-center gap-1 shadow-2xs active:scale-95"
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
              {replyingTo && !noteMode && (
                <div className="mb-2 flex items-center gap-2 rounded-2xl bg-raised px-3 py-2">
                  <div className="min-w-0 flex-1 border-l-4 border-primary pl-2">
                    <p className="text-xs font-semibold text-foreground">
                      Replying to {replyingTo.direction === 'OUTBOUND' ? 'yourself' : contactName}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{messagePreview(replyingTo)}</p>
                  </div>
                  <IconButton label="Cancel reply" size="sm" onClick={() => setReplyingTo(null)}>
                    <X />
                  </IconButton>
                </div>
              )}
              {noteMode && (
                <div className="mb-2 flex items-center gap-2 rounded-2xl bg-warning-subtle px-3 py-2 text-warning-subtle-foreground">
                  <Lock className="size-4 shrink-0" />
                  <p className="min-w-0 flex-1 text-sm font-medium">Note to your team. Only your team sees this.</p>
                  <IconButton label="Cancel note" size="sm" onClick={() => setNoteMode(false)}>
                    <X />
                  </IconButton>
                </div>
              )}

              <form onSubmit={handleSend} className="flex items-center gap-2">
                <IconButton label="Attach" onClick={() => setIsAttachSheetOpen(true)}>
                  <Plus />
                </IconButton>

                <input
                  ref={textInputRef}
                  type="text"
                  placeholder={noteMode ? 'Write a note for your team' : 'Message'}
                  value={text}
                  onChange={handleTextChange}
                  className={`h-11 min-w-0 flex-1 rounded-full px-4 text-base text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                    noteMode ? 'bg-warning-subtle' : 'bg-raised'
                  }`}
                />

                {text.trim() ? (
                  <Button type="submit" variant="wa" size="icon-lg" disabled={isSending} aria-label={noteMode ? 'Save note' : 'Send message'}>
                    {isSending ? <Loader2 className="animate-spin" /> : <Send />}
                  </Button>
                ) : (
                  <IconButton label="Record a voice note" size="lg" onClick={() => setIsRecordingVoice(true)}>
                    <Mic />
                  </IconButton>
                )}
              </form>
            </div>
          )}

          {/* Quick Template Picker Drawer */}
          {isTemplatePickerOpen && (
            <div className="mt-3 p-4 bg-card rounded-2xl border border-border shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Select Approved WhatsApp Template</span>
                <button
                  onClick={() => setIsTemplatePickerOpen(false)}
                  className="text-xs text-muted-foreground hover:text-foreground p-1 rounded-lg"
                >
                  Close
                </button>
              </div>

              {templates.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No approved templates found. Create or sync templates in the Templates tab.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="p-3 rounded-xl border border-border bg-muted hover:border-emerald-500 hover:bg-emerald-50/50 flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-[0.99]"
                      onClick={() => handleSendTemplate(tpl)}
                    >
                      <div className="min-w-0">
                        <h5 className="text-xs font-semibold text-foreground font-mono">{tpl.name}</h5>
                        <p className="text-2xs text-muted-foreground truncate">{tpl.category} &bull; {tpl.language}</p>
                      </div>
                      <button
                        type="button"
                        disabled={isSending}
                        className="px-3 py-1 rounded-lg bg-primary hover:bg-primary/90 text-white text-2xs font-semibold shrink-0 shadow-2xs"
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

      <MessageMenu
        message={menuMessage}
        onClose={() => setMenuMessage(null)}
        onReply={handleReplyTo}
        onReact={handleReact}
        onStar={handleStar}
        onCopy={(m) => handleCopyMessage(m.body)}
        onForward={handleOpenForward}
        onEdit={(m) => {
          setEditingMessageId(m.id);
          setEditMessageText(m.body);
        }}
        myReaction={menuMessage ? parseReactions(menuMessage.reactions).find((r) => r.from !== 'customer')?.emoji : undefined}
      />

      <AttachSheet
        open={isAttachSheetOpen}
        onOpenChange={setIsAttachSheetOpen}
        onPhoto={() => triggerFileInput('image')}
        onDocument={() => triggerFileInput('document')}
        onTemplate={() => setIsTemplatePickerOpen(true)}
        onSavedReply={openSavedReplies}
        onNote={() => {
          setReplyingTo(null);
          setNoteMode(true);
          setTimeout(() => textInputRef.current?.focus(), 0);
        }}
      />

      <BottomSheet open={isStarredOpen} onOpenChange={setIsStarredOpen} title="Starred messages">
        <div className="max-h-[60vh] overflow-y-auto pb-2">
          {starredMessages.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Star a message to find it here.</p>
          ) : (
            starredMessages.map((sm) => (
              <div key={sm.id} className="border-b border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  {sm.direction === 'OUTBOUND' ? 'You' : sm.direction === 'INTERNAL' ? 'Team note' : contactName} - {dayLabel(new Date(sm.timestamp))}, {timeLabel(new Date(sm.timestamp))}
                </p>
                <p className="whitespace-pre-wrap text-sm text-foreground">{messagePreview(sm)}</p>
              </div>
            ))
          )}
        </div>
      </BottomSheet>

      {/* Invoice Generator Modal */}
      <Modal
        open={isInvoiceModalOpen}
        onOpenChange={(o) => !o && setIsInvoiceModalOpen(false)}
        size="sm"
        title={
          <span className="inline-flex items-center gap-1.5">
            <CreditCard className="size-4 text-primary" />
            Payment link generator
          </span>
        }
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsInvoiceModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleInsertPaymentLink}>
              <CheckCircle2 />
              Insert in chat
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">Item / service description</label>
            <Input value={invoiceItem} onChange={(e) => setInvoiceItem(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">Amount ($ USD)</label>
            <Input type="number" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} />
          </div>
        </div>
      </Modal>

      {/* Forward Message Modal */}
      <Modal
        open={isForwardModalOpen && !!forwardingMessage}
        onOpenChange={(o) => !o && setIsForwardModalOpen(false)}
        size="sm"
        title={
          <span className="inline-flex items-center gap-1.5">
            <Forward className="size-4 text-info" />
            Forward message
          </span>
        }
      >
        <div className="space-y-4">
          <div className="max-h-20 overflow-y-auto rounded-lg border border-border bg-muted p-3 text-2xs italic text-foreground">
            {forwardingMessage?.body ? `"${forwardingMessage.body}"` : '[Media message]'}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-foreground">Select contact</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search name or phone…"
                value={forwardSearch}
                onChange={handleSearchContactsForForward}
                className="pl-8"
              />
            </div>
          </div>

          <div className="max-h-44 space-y-1 overflow-y-auto">
            {forwardContacts.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-accent">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {c.firstName} {c.lastName || ''}
                  </p>
                  <p className="font-mono text-2xs text-muted-foreground">{c.phoneNumber}</p>
                </div>
                <Button size="xs" onClick={() => handleForwardSubmit(c.id)} disabled={isForwarding}>
                  Send
                </Button>
              </div>
            ))}
            {forwardContacts.length === 0 && (
              <p className="py-2 text-center text-xs text-muted-foreground">No contacts found</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Right Sidebar: In-Chat Visual Lead CRM Panel */}
      {modules.lead_crm && (
        <div className="w-72 bg-card border-l border-border flex flex-col shrink-0 hidden xl:flex">
          {/* CRM Tabs Header */}
          <div className="p-2 border-b border-border bg-muted/80 grid grid-cols-3 gap-1">
            <button
              onClick={() => setActiveCrmTab('details')}
              className={`py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                activeCrmTab === 'details'
                  ? 'bg-card text-foreground font-semibold shadow-2xs'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveCrmTab('notes')}
              className={`py-1.5 rounded-lg text-xs font-medium transition-all text-center flex items-center justify-center gap-1 ${
                activeCrmTab === 'notes'
                  ? 'bg-card text-foreground font-semibold shadow-2xs'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <span>Notes</span>
              {crmData?.contact?.conversation?.notes?.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-400 text-foreground text-2xs flex items-center justify-center font-bold">
                  {crmData.contact.conversation.notes.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveCrmTab('timeline')}
              className={`py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                activeCrmTab === 'timeline'
                  ? 'bg-card text-foreground font-semibold shadow-2xs'
                  : 'text-muted-foreground hover:bg-accent'
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
                <div className="text-center pb-3 border-b border-border">
                  <div className="w-12 h-12 rounded-full bg-primary text-white font-bold text-base flex items-center justify-center mx-auto mb-2 shadow-2xs ring-2 ring-primary/20">
                    {contactName.substring(0, 2).toUpperCase()}
                  </div>
                  <h4 className="text-xs font-bold text-foreground">{contactName}</h4>
                  <p className="text-2xs text-muted-foreground font-mono">{contact?.phoneNumber}</p>
                </div>

                {/* Lead Stage Selector */}
                <div className="space-y-1.5">
                  <label className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Deal Stage
                  </label>
                  <select
                    value={leadStage}
                    onChange={(e) => {
                      setLeadStage(e.target.value);
                      handleSaveCrmDetails(e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs font-normal rounded-full border border-input bg-card focus:outline-hidden focus:ring-2 focus:ring-ring"
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
                  <label className="text-2xs font-normal text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-muted-foreground" />
                    <span>Estimated Deal Value</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={dealValue}
                      onChange={(e) => setDealValue(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-2.5 py-1 text-xs rounded-full border border-input bg-card"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveCrmDetails()}
                      className="px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-normal shrink-0"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* Company & City */}
                <div className="space-y-2">
                  <div>
                    <label className="text-2xs font-normal text-muted-foreground uppercase tracking-wider">Company</label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="w-full px-2.5 py-1 text-xs rounded-full border border-input bg-card mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-2xs font-normal text-muted-foreground uppercase tracking-wider">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Dubai / Riyadh"
                      className="w-full px-2.5 py-1 text-xs rounded-full border border-input bg-card mt-1"
                    />
                  </div>
                </div>

                {/* Assigned Agent */}
                <div className="space-y-1.5">
                  <label className="text-2xs font-normal text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-muted-foreground" />
                    <span>Assigned Sales Rep</span>
                  </label>
                  <select
                    value={crmData?.contact?.conversation?.assignedToId || ''}
                    onChange={(e) => handleSaveCrmDetails(undefined, e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-full border border-input bg-card"
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
                  <label className="text-2xs font-normal text-muted-foreground uppercase tracking-wider">Tags</label>
                  <div className="flex flex-wrap gap-1">
                    {crmData?.contact?.tags?.map((t: any) => (
                      <span
                        key={t.tagId}
                        className="px-2 py-0.5 rounded text-2xs font-normal bg-blue-100 text-blue-800"
                      >
                        {t.tag?.name}
                      </span>
                    ))}
                    {(!crmData?.contact?.tags || crmData?.contact?.tags.length === 0) && (
                      <span className="text-2xs text-muted-foreground">No tags assigned</span>
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
                    className="w-full p-2 text-xs rounded-full border border-amber-300 bg-amber-50/50 focus:outline-hidden focus:ring-2 focus:ring-amber-400 placeholder:text-amber-800/40"
                  />
                  <button
                    type="submit"
                    disabled={!newNoteText.trim()}
                    className="w-full py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-normal text-xs shadow-xs disabled:opacity-50"
                  >
                    Add Private Note
                  </button>
                </form>

                <div className="space-y-2 pt-2">
                  {crmData?.contact?.conversation?.notes?.map((n: any) => (
                    <div key={n.id} className="p-2.5 rounded-full bg-amber-50 border border-amber-200 space-y-1 text-xs">
                      <p className="text-amber-950 whitespace-pre-wrap">{n.body}</p>
                      <div className="flex items-center justify-between text-2xs text-amber-700/70 pt-1 border-t border-amber-200/50">
                        <span>{n.author?.name || 'Agent'}</span>
                        <span>{formatTimeAgo(n.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                  {(!crmData?.contact?.conversation?.notes || crmData.contact.conversation.notes.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center py-4">No notes added yet.</p>
                  )}
                </div>
              </div>
            )}

            {activeCrmTab === 'timeline' && (
              <div className="space-y-3">
                <div className="space-y-2 text-xs">
                  {crmData?.contact?.conversation?.events?.map((ev: any) => (
                    <div key={ev.id} className="p-2 rounded-full bg-card border border-border space-y-0.5">
                      <span className="font-normal text-2xs text-foreground uppercase tracking-wider block">
                        {ev.type}
                      </span>
                      <p className="text-muted-foreground text-2xs">
                        {ev.actor?.name ? `By ${ev.actor.name}` : 'System'}
                      </p>
                      <span className="text-2xs text-muted-foreground">{formatTimeAgo(ev.createdAt)}</span>
                    </div>
                  ))}
                  {(!crmData?.contact?.conversation?.events || crmData.contact.conversation.events.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center py-4">No activity events recorded yet.</p>
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
