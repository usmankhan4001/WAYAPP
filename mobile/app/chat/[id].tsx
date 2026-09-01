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
  if (status === 'FAILED') return <AlertCircle color="#f87171" size={12} />;
  if (status === 'READ') return <CheckCheck color="#53bdeb" size={13} />;
  if (status === 'DELIVERED') return <CheckCheck color="#94a3b8" size={13} />;
  return <Check color="#94a3b8" size={13} />;
}

export default function MobileChatScreen() {
  const { id: contactId } = useLocalSearchParams();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const listRef = useRef<FlatList>(null);

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
    mutationFn: async (payload: { text?: string; templateName?: string; languageCode?: string }) => {
      return await mobileApiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          contactId,
          ...(payload.text ? { text: payload.text } : {}),
          ...(payload.templateName
            ? { templateName: payload.templateName, languageCode: payload.languageCode || 'en_US', bodyVariables: [] }
            : {}),
        }),
      });
    },
    onSuccess: () => {
      setText('');
      setShowTemplatePicker(false);
      queryClient.invalidateQueries({ queryKey: ['messages', contactId] });
    },
    onError: (err: any) => {
      Alert.alert('Send Failed', err.message || 'Could not send message. Please try again.');
    },
  });

  const handleSend = () => {
    if (!text.trim() || sendMutation.isPending) return;
    sendMutation.mutate({ text: text.trim() });
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
            <FileText color="#ffffff" size={16} />
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
            <PlayCircle color="#ffffff" size={16} />
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
            <ShieldAlert color="#fbbf24" size={14} />
            <Text style={styles.windowTextAlert}>
              24-Hour WhatsApp Policy: Customer has not messaged recently. Send a template to re-engage.
            </Text>
          </View>
        ) : (
          <View style={styles.windowBannerActive}>
            <Clock color="#34d399" size={14} />
            <Text style={styles.windowTextActive}>24-Hour Active Session: Free-form messaging enabled</Text>
          </View>
        )}

        {/* Message Thread */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#10b981" />
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
              <RefreshControl refreshing={isRefetching} onRefresh={refetchMessages} tintColor="#10b981" />
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

              const isOutbound = item.direction === 'OUTBOUND';
              return (
                <View style={[styles.msgBubble, isOutbound ? styles.msgOutbound : styles.msgInbound]}>
                  {renderMessageContent(item)}
                  <View style={styles.msgFooter}>
                    <Text style={styles.msgTime}>
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {isOutbound && <StatusTick status={item.status} />}
                  </View>
                </View>
              );
            }}
            contentContainerStyle={styles.msgList}
          />
        )}

        {/* Send Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={[styles.templateBtn, isOutside24h && styles.templateBtnHighlight]}
            onPress={() => setShowTemplatePicker(true)}
          >
            <MessageSquarePlus color={isOutside24h ? '#020617' : '#34d399'} size={18} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={isOutside24h ? 'Outside 24h window — send a template' : 'Type WhatsApp message...'}
            placeholderTextColor="#64748b"
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
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Send color="#ffffff" size={16} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

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
                <X color="#94a3b8" size={18} />
              </TouchableOpacity>
            </View>

            {templatesLoading ? (
              <ActivityIndicator color="#10b981" style={{ marginVertical: 24 }} />
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
                    <FileText color="#34d399" size={16} />
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
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  statusText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
  },
  windowBannerActive: {
    backgroundColor: '#064e3b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  windowTextActive: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '600',
  },
  windowBannerAlert: {
    backgroundColor: '#451a03',
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  windowTextAlert: {
    color: '#fde68a',
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
    backgroundColor: '#1e293b',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  dateSeparatorText: {
    color: '#94a3b8',
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
    backgroundColor: '#1e293b',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  msgOutbound: {
    backgroundColor: '#059669',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  msgText: {
    color: '#ffffff',
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
    backgroundColor: '#0f172a',
  },
  mediaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    maxWidth: 220,
  },
  mediaChipText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    gap: 8,
  },
  templateBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateBtnHighlight: {
    backgroundColor: '#34d399',
    borderColor: '#34d399',
  },
  input: {
    flex: 1,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 13,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#059669',
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
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#ffffff',
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
    borderBottomColor: '#1e293b',
  },
  templateName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  templateMeta: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
});
