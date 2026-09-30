import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mobileApiFetch } from '../../lib/api';
import { theme } from '../../lib/theme';

const c = theme.dark;

type FilterId = 'all' | 'unread' | 'waiting' | 'archived' | 'mine';

// Same filters as the web inbox; the server does the work (GET /api/chat?filter=...).
const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'waiting', label: 'Waiting on me' },
  { id: 'archived', label: 'Archived' },
  { id: 'mine', label: 'Mine' },
];

export default function MobileInboxScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterId>('all');
  const queryClient = useQueryClient();

  const { data: conversations, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['mobile_conversations', filter],
    queryFn: async () => {
      const data = await mobileApiFetch(`/api/chat?filter=${filter}&limit=50`);
      return Array.isArray(data) ? data : data?.conversations || [];
    },
    refetchInterval: 5000,
  });

  const updateConversation = async (item: any, body: Record<string, unknown>) => {
    try {
      await mobileApiFetch(`/api/chat/conversations/${item.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      queryClient.invalidateQueries({ queryKey: ['mobile_conversations'] });
    } catch (err: any) {
      Alert.alert('Could not update the chat', err.message || 'Try again in a moment.');
    }
  };

  // Long-press a chat: pin, archive or mark unread.
  const openActions = (item: any) => {
    Alert.alert('Chat actions', undefined, [
      { text: item.pinned ? 'Unpin chat' : 'Pin chat', onPress: () => updateConversation(item, { pinned: !item.pinned }) },
      { text: item.archived ? 'Move back to chats' : 'Archive chat', onPress: () => updateConversation(item, { archived: !item.archived }) },
      ...(item.unreadCount > 0 ? [] : [{ text: 'Mark as unread', onPress: () => updateConversation(item, { markUnread: true }) }]),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    const contact = item.contact || {};
    const name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.phoneNumber || 'Customer';
    const lastMsg = item.messages?.[0];

    return (
      <TouchableOpacity
        style={styles.convCard}
        onPress={() => router.push(`/chat/${contact.id}`)}
        onLongPress={() => openActions(item)}
        delayLongPress={400}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>

        <View style={styles.convInfo}>
          <View style={styles.convHeader}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {item.pinned && <Text style={styles.pinned}>Pinned</Text>}
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>

          <Text style={styles.lastMsg} numberOfLines={1}>
            {lastMsg?.body || contact.phoneNumber}
          </Text>

          <View style={styles.tagsRow}>
            {item.assignedTo ? (
              <View style={styles.assigneeChip}>
                <Text style={styles.assigneeText}>{item.assignedTo.name || 'Assigned'}</Text>
              </View>
            ) : (
              <View style={styles.unassignedChip}>
                <Text style={styles.unassignedText}>Unassigned</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[styles.filterChipText, filter === f.id && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Couldn't load conversations.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={c.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No conversations here</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  list: {
    padding: 12,
  },
  filterScroll: {
    flexGrow: 0,
  },
  pinned: {
    color: c['muted-foreground'],
    fontSize: 11,
    marginLeft: 6,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    minHeight: 40,
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.secondary,
  },
  filterChipActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  filterChipText: {
    color: c['muted-foreground'],
    fontSize: 13,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: c['primary-foreground'],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: c['muted-foreground'],
    fontSize: 13,
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.secondary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {
    color: c.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: c.secondary,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c['brand-subtle'],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: c.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  convInfo: {
    flex: 1,
  },
  convHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    color: c.foreground,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: c.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unreadText: {
    color: c.foreground,
    fontSize: 10,
    fontWeight: '800',
  },
  lastMsg: {
    color: c['muted-foreground'],
    fontSize: 12,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assigneeChip: {
    backgroundColor: c['info-subtle'],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  assigneeText: {
    color: c.info,
    fontSize: 10,
    fontWeight: '600',
  },
  unassignedChip: {
    backgroundColor: c.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unassignedText: {
    color: c['muted-foreground'],
    fontSize: 10,
  },
});
