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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { mobileApiFetch } from '../../lib/api';

export default function MobileInboxScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'mine' | 'unassigned'>('all');

  const { data: conversations, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['mobile_conversations', filter],
    queryFn: async () => {
      const data = await mobileApiFetch(`/api/v1/conversations`);
      return Array.isArray(data) ? data : [];
    },
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
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#10b981" />
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
              tintColor="#10b981"
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No active conversations</Text>
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
    backgroundColor: '#020617',
  },
  list: {
    padding: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#064e3b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#34d399',
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
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  lastMsg: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assigneeChip: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  assigneeText: {
    color: '#93c5fd',
    fontSize: 10,
    fontWeight: '600',
  },
  unassignedChip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unassignedText: {
    color: '#64748b',
    fontSize: 10,
  },
});
