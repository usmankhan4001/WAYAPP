import React, { useState } from 'react';
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
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Clock, ShieldAlert } from 'lucide-react-native';
import { mobileApiFetch } from '../../lib/api';

export default function MobileChatScreen() {
  const { id: contactId } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');

  // Fetch messages
  const { data: messages, isLoading } = useQuery({
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

  const sendMutation = useMutation({
    mutationFn: async (messageText: string) => {
      return await mobileApiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          contactId,
          text: messageText,
        }),
      });
    },
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: ['messages', contactId] });
    },
  });

  const handleSend = () => {
    if (!text.trim() || sendMutation.isPending) return;
    sendMutation.mutate(text.trim());
  };

  // Check 24-hour customer window
  const lastInteraction = contact?.lastInteractionAt ? new Date(contact.lastInteractionAt).getTime() : 0;
  const isOutside24h = (Date.now() - lastInteraction) > (24 * 60 * 60 * 1000);

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
              24-Hour WhatsApp Policy: Customer has not messaged recently. Only templates permitted.
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
        ) : (
          <FlatList
            data={messages || []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isOutbound = item.direction === 'OUTBOUND';
              return (
                <View
                  style={[
                    styles.msgBubble,
                    isOutbound ? styles.msgOutbound : styles.msgInbound,
                  ]}
                >
                  <Text style={styles.msgText}>{item.body}</Text>
                  <Text style={styles.msgTime}>
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            }}
            contentContainerStyle={styles.msgList}
          />
        )}

        {/* Send Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={isOutside24h ? 'Template message required...' : 'Type WhatsApp message...'}
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
  msgTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 4,
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
});
