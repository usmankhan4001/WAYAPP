import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { mobileApiFetch, getCurrentUserId } from '../../lib/api';
import { theme } from '../../lib/theme';

const c = theme.dark;

const FILTERS: { id: 'all' | 'mine' | 'unassigned'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'Assigned to Me' },
  { id: 'unassigned', label: 'Unassigned' },
];

export default function MobileInboxScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'mine' | 'unassigned'>('all');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUserId().then(setUserId);
  }, []);

  const { data: conversations, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['mobile_conversations', filter, userId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter === 'mine' && userId) params.set('assignedToId', userId);
      if (filter === 'unassigned') params.set('assignedToId', 'none');
      const qs = params.toString();
      const data = await mobileApiFetch(`/api/v1/conversations${qs ? `?${qs}` : ''}`);
      return Array.isArray(data) ? data : [];
    },
    enabled: filter !== 'mine' || Boolean(userId),
    refetchInterval: 5000,
  });

  const renderItem = ({ item }: { item: any }) => {
    const contact = item.contact || {};
    const name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.phoneNumber || 'Customer';
    const lastMsg = item.messages?.[0];

    return (
      <TouchableOpacity
        style={styles.convCard}
        onPress={() => router.push(`/chat/${contact.id}`)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>

        <View style={styles.convInfo}>
          <View style={styles.convHeader}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
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
      <View style={styles.filterRow}>
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
      </View>

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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
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
    fontSize: 11,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: c.foreground,
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
