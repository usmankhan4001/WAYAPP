import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  Clock,
  ShieldAlert,
  Check,
  CheckCheck,
  AlertCircle,
  FileText,
  PlayCircle,
  X,
  MessageSquarePlus,
} from 'lucide-react-native';
import { mobileApiFetch, getServerUrl } from '../../lib/api';
import { theme } from '../../lib/theme';
import { clearBadge } from '../../lib/push';

const c = theme.dark;

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (isSameDay(d, today)) return 'Today';
  if (isSameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

function buildListWithSeparators(messages: any[]) {
  const result: any[] = [];
  let lastDateKey: string | null = null;
  for (const msg of messages) {
    const dateKey = new Date(msg.timestamp).toDateString();
    if (dateKey !== lastDateKey) {
      result.push({ _type: 'separator', id: `sep-${dateKey}`, label: formatDateLabel(msg.timestamp) });
      lastDateKey = dateKey;
    }
    result.push({ _type: 'message', ...msg });
  }
  return result;
}

function StatusTick({ status }: { status: string }) {
  if (status === 'FAILED') return <AlertCircle color={c.destructive} size={12} />;
  if (status === 'READ') return <CheckCheck color={c.info} size={13} />;
  if (status === 'DELIVERED') return <CheckCheck color={c["muted-foreground"]} size={13} />;
  return <Check color={c["muted-foreground"]} size={13} />;
}

export default function MobileChatScreen() {
  const { id: contactId } = useLocalSearchParams();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [menuMessage, setMenuMessage] = useState<any | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    clearBadge();
  }, [contactId]);

  useEffect(() => {
    getServerUrl().then(setServerUrl);
  }, []);

  // Fetch messages
  const {
    data: messages,
    isLoading,
    isError,
    refetch: refetchMessages,
    isRefetching,
  } = useQuery({
    queryKey: ['messages', contactId],
    queryFn: async () => {
      const data = await mobileApiFetch(`/api/chat?contactId=${contactId}`);
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 3000,
  });

  // Fetch contact details
  const { data: contact } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      return await mobileApiFetch(`/api/v1/contacts/${contactId}`);
    },
  });

  // Fetch approved templates only when the picker is opened
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const data = await mobileApiFetch('/api/templates');
      return Array.isArray(data) ? data.filter((t: any) => t.status === 'APPROVED') : [];
    },
    enabled: showTemplatePicker,
  });

  const contactName = contact
    ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.phoneNumber
    : 'Chat';

  useEffect(() => {
    navigation.setOptions({ title: contactName });
  }, [contactName, navigation]);

  const listData = useMemo(() => buildListWithSeparators(messages || []), [messages]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      return () => clearTimeout(timer);
    }
  }, [messages?.length]);

  const sendMutation = useMutation({
    mutationFn: async (payload: { text?: string; templateName?: string; languageCode?: string; replyToWamid?: string }) => {
      return await mobileApiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          contactId,
          ...(payload.text ? { text: payload.text } : {}),
          ...(payload.replyToWamid ? { replyToWamid: payload.replyToWamid } : {}),
          ...(payload.templateName
            ? { templateName: payload.templateName, languageCode: payload.languageCode || 'en_US', bodyVariables: [] }
            : {}),
        }),
      });
    },
    onSuccess: () => {
      setText('');
      setReplyingTo(null);
      setShowTemplatePicker(false);
      queryClient.invalidateQueries({ queryKey: ['messages', contactId] });
    },
    onError: (err: any) => {
      Alert.alert('Send Failed', err.message || 'Could not send message. Please try again.');
    },
  });

  const handleSend = () => {
    if (!text.trim() || sendMutation.isPending) return;
    sendMutation.mutate({ text: text.trim(), replyToWamid: replyingTo?.wamid || undefined });
  };

  const refreshMessages = () => queryClient.invalidateQueries({ queryKey: ['messages', contactId] });

  // Star or unstar (PATCH /api/chat/messages/:id).
  const toggleStar = async (m: any) => {
    try {
      await mobileApiFetch(`/api/chat/messages/${m.id}`, { method: 'PATCH', body: JSON.stringify({ starred: !m.starred }) });
      refreshMessages();
    } catch (err: any) {
      Alert.alert('Could not star the message', err.message || 'Try again.');
    }
  };

  // React (POST /api/chat/messages/:id/reaction). An empty emoji removes our reaction.
  const react = async (m: any, emoji: string) => {
    try {
      await mobileApiFetch(`/api/chat/messages/${m.id}/reaction`, { method: 'POST', body: JSON.stringify({ emoji }) });
      refreshMessages();
    } catch (err: any) {
      Alert.alert('Could not send the reaction', err.message || 'Try again.');
    }
  };

  const parseReactions = (raw?: string | null): { emoji: string; from: string }[] => {
    try {
      const v = raw ? JSON.parse(raw) : [];
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };


  const resolveMediaUrl = (url: string) => (url.startsWith('http') ? url : `${serverUrl}${url}`);

  // Check 24-hour customer window
  const lastInteraction = contact?.lastInteractionAt ? new Date(contact.lastInteractionAt).getTime() : 0;
  const isOutside24h = Date.now() - lastInteraction > 24 * 60 * 60 * 1000;

  const renderMessageContent = (item: any) => {
    const absoluteMediaUrl = item.mediaUrl ? resolveMediaUrl(item.mediaUrl) : null;

    switch (item.messageType) {
      case 'image':
        return (
          <View>
            {absoluteMediaUrl && (
              <Image source={{ uri: absoluteMediaUrl }} style={styles.mediaImage} resizeMode="cover" />
            )}
            {item.body ? <Text style={[styles.msgText, { marginTop: 6 }]}>{item.body}</Text> : null}
          </View>
        );
      case 'document':
        return (
          <TouchableOpacity
            style={styles.mediaChip}
            onPress={() => absoluteMediaUrl && Linking.openURL(absoluteMediaUrl)}
          >
            <FileText color={c.foreground} size={16} />
            <Text style={styles.mediaChipText} numberOfLines={1}>
              {item.body || 'Document'}
            </Text>
          </TouchableOpacity>
        );
      case 'audio':
      case 'video':
        return (
          <TouchableOpacity
            style={styles.mediaChip}
            onPress={() => absoluteMediaUrl && Linking.openURL(absoluteMediaUrl)}
          >
            <PlayCircle color={c.foreground} size={16} />
            <Text style={styles.mediaChipText}>
              {item.messageType === 'audio' ? 'Voice message' : 'Video message'}
            </Text>
          </TouchableOpacity>
        );
      default:
        return <Text style={styles.msgText}>{item.body}</Text>;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* 24h Window Indicator Banner */}
        {isOutside24h ? (
          <View style={styles.windowBannerAlert}>
            <ShieldAlert color={c.warning} size={14} />
            <Text style={styles.windowTextAlert}>
              Use a template to reply
            </Text>
          </View>
        ) : (
          <View style={styles.windowBannerActive}>
            <Clock color={c.primary} size={14} />
            <Text style={styles.windowTextActive}>You can reply freely</Text>
          </View>
        )}

        {/* Message Thread */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Text style={styles.statusText}>Couldn't load messages. Check your connection and try again.</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={listData}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetchMessages} tintColor={c.primary} />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.statusText}>No messages yet</Text>
              </View>
            }
            renderItem={({ item }) => {
              if (item._type === 'separator') {
                return (
                  <View style={styles.dateSeparatorRow}>
                    <View style={styles.dateSeparatorPill}>
                      <Text style={styles.dateSeparatorText}>{item.label}</Text>
                    </View>
                  </View>
                );
              }

              // Internal note: only the team sees it, it is never sent to WhatsApp.
              if (item.direction === 'INTERNAL') {
                return (
                  <TouchableOpacity activeOpacity={0.9} onLongPress={() => setMenuMessage(item)} style={styles.noteBubble}>
                    <Text style={styles.noteLabel}>Only your team sees this</Text>
                    <Text style={styles.msgText}>{item.body}</Text>
                  </TouchableOpacity>
                );
              }

              const isOutbound = item.direction === 'OUTBOUND';
              const quoted = item.replyToWamid ? (messages || []).find((x: any) => x.wamid === item.replyToWamid) : null;
              const reactions = parseReactions(item.reactions);
              return (
                <View>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onLongPress={() => setMenuMessage(item)}
                  delayLongPress={350}
                  style={[styles.msgBubble, isOutbound ? styles.msgOutbound : styles.msgInbound]}
                >
                  {item.replyToWamid ? (
                    <View style={styles.quoteBox}>
                      <Text style={styles.quoteText} numberOfLines={2}>
                        {quoted?.body || 'Original message'}
                      </Text>
                    </View>
                  ) : null}
                  {renderMessageContent(item)}
                  <View style={styles.msgFooter}>
                    <Text style={styles.msgTime}>
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {item.starred ? <Text style={styles.msgTime}>Starred</Text> : null}
                    {isOutbound && <StatusTick status={item.status} />}
                  </View>
                </TouchableOpacity>
                {reactions.length > 0 && (
                  <View style={[styles.reactionRow, isOutbound ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
                    {reactions.map((r, i) => (
                      <Text key={i} style={styles.reactionChip}>
                        {r.emoji}
                      </Text>
                    ))}
                  </View>
                )}
                </View>
              );
            }}
            contentContainerStyle={styles.msgList}
          />
        )}

        {replyingTo && (
          <View style={styles.replyBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.replyBarTitle}>Replying to {replyingTo.direction === 'OUTBOUND' ? 'yourself' : 'customer'}</Text>
              <Text style={styles.quoteText} numberOfLines={1}>
                {replyingTo.body || 'Message'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} accessibilityLabel="Cancel reply">
              <X color={c['muted-foreground']} size={18} />
            </TouchableOpacity>
          </View>
        )}

        {/* Send Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={[styles.templateBtn, isOutside24h && styles.templateBtnHighlight]}
            onPress={() => setShowTemplatePicker(true)}
          >
            <MessageSquarePlus color={isOutside24h ? c.background : c.primary} size={18} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={isOutside24h ? 'Outside 24h window — send a template' : 'Type WhatsApp message...'}
            placeholderTextColor={c["muted-foreground"]}
            value={text}
            onChangeText={setText}
            editable={!isOutside24h}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || isOutside24h) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || isOutside24h || sendMutation.isPending}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator color={c.foreground} size="small" />
            ) : (
              <Send color={c.foreground} size={16} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Message menu: reactions, reply, star */}
      <Modal visible={!!menuMessage} animationType="slide" transparent onRequestClose={() => setMenuMessage(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuMessage(null)}>
          <View style={styles.modalSheet}>
            {menuMessage && menuMessage.direction !== 'INTERNAL' && (
              <View style={styles.emojiRow}>
                {['\u{1F44D}', '\u2764\uFE0F', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F64F}'].map((e) => (
                  <TouchableOpacity
                    key={e}
                    style={styles.emojiBtn}
                    onPress={() => {
                      react(menuMessage, e);
                      setMenuMessage(null);
                    }}
                  >
                    <Text style={styles.emojiText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {menuMessage && menuMessage.direction !== 'INTERNAL' && (
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => {
                  setReplyingTo(menuMessage);
                  setMenuMessage(null);
                }}
              >
                <Text style={styles.menuRowText}>Reply</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                if (menuMessage) toggleStar(menuMessage);
                setMenuMessage(null);
              }}
            >
              <Text style={styles.menuRowText}>{menuMessage?.starred ? 'Remove star' : 'Star'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Template Picker */}
      <Modal
        visible={showTemplatePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTemplatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send a Template</Text>
              <TouchableOpacity onPress={() => setShowTemplatePicker(false)}>
                <X color={c["muted-foreground"]} size={18} />
              </TouchableOpacity>
            </View>

            {templatesLoading ? (
              <ActivityIndicator color={c.primary} style={{ marginVertical: 24 }} />
            ) : !templates || templates.length === 0 ? (
              <Text style={[styles.statusText, { marginVertical: 24 }]}>
                No approved templates available. Sync templates from the web dashboard first.
              </Text>
            ) : (
              <FlatList
                data={templates}
                keyExtractor={(item: any) => item.id}
                style={{ maxHeight: 360 }}
                renderItem={({ item }: any) => (
                  <TouchableOpacity
                    style={styles.templateRow}
                    disabled={sendMutation.isPending}
                    onPress={() => sendMutation.mutate({ templateName: item.name, languageCode: item.language })}
                  >
                    <FileText color={c.primary} size={16} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.templateName}>{item.name}</Text>
                      <Text style={styles.templateMeta}>
                        {item.category} • {item.language}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  noteBubble: {
    alignSelf: 'center',
    width: '92%',
    backgroundColor: c['warning-subtle'],
    borderColor: c.warning,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 12,
    marginVertical: 4,
  },
  noteLabel: {
    color: c['warning-subtle-foreground'],
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  quoteBox: {
    borderLeftWidth: 3,
    borderLeftColor: c.primary,
    backgroundColor: c.raised,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  quoteText: {
    color: c['muted-foreground'],
    fontSize: 13,
  },
  reactionRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: -6,
    marginHorizontal: 12,
    marginBottom: 6,
  },
  reactionChip: {
    backgroundColor: c.card,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 14,
    overflow: 'hidden',
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.raised,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  replyBarTitle: {
    color: c.foreground,
    fontSize: 12,
    fontWeight: '700',
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 26,
  },
  menuRow: {
    minHeight: 48,
    justifyContent: 'center',
  },
  menuRowText: {
    color: c.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  statusText: {
    color: c['muted-foreground'],
    fontSize: 12,
    textAlign: 'center',
  },
  windowBannerActive: {
    backgroundColor: c['brand-subtle'],
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  windowTextActive: {
    color: c.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  windowBannerAlert: {
    backgroundColor: c['warning-subtle'],
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  windowTextAlert: {
    color: c['warning-subtle-foreground'],
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  msgList: {
    padding: 14,
  },
  dateSeparatorRow: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateSeparatorPill: {
    backgroundColor: c.secondary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  dateSeparatorText: {
    color: c['muted-foreground'],
    fontSize: 10,
    fontWeight: '700',
  },
  msgBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 16,
    marginBottom: 8,
  },
  msgInbound: {
    backgroundColor: c.secondary,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  msgOutbound: {
    backgroundColor: c.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  msgText: {
    color: c.foreground,
    fontSize: 13,
    lineHeight: 18,
  },
  msgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  msgTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
  },
  mediaImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: c.card,
  },
  mediaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    maxWidth: 220,
  },
  mediaChipText: {
    color: c.foreground,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: c.card,
    borderTopWidth: 1,
    borderTopColor: c.secondary,
    gap: 8,
  },
  templateBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateBtnHighlight: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  input: {
    flex: 1,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: c.foreground,
    fontSize: 13,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: c.secondary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    color: c.foreground,
    fontSize: 14,
    fontWeight: '800',
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: c.secondary,
  },
  templateName: {
    color: c.foreground,
    fontSize: 13,
    fontWeight: '700',
  },
  templateMeta: {
    color: c['muted-foreground'],
    fontSize: 10,
    marginTop: 2,
  },
});
