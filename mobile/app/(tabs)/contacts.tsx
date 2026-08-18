import React from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { mobileApiFetch } from '../../lib/api';

export default function MobileContactsScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['mobile_contacts'],
    queryFn: async () => {
      const res = await mobileApiFetch('/api/v1/contacts?limit=50');
      return res.data || [];
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#10b981" />
        </View>
      ) : (
        <FlatList
          data={data || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.firstName || item.phoneNumber).charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>
                  {`${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Customer'}
                </Text>
                <Text style={styles.phone}>{item.phoneNumber}</Text>
              </View>
              <View style={[styles.badge, item.status === 'ACTIVE' ? styles.badgeActive : styles.badgeInactive]}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  list: { padding: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  info: { flex: 1 },
  name: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  phone: { color: '#64748b', fontSize: 11, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeActive: { backgroundColor: '#064e3b' },
  badgeInactive: { backgroundColor: '#451a03' },
  badgeText: { color: '#ffffff', fontSize: 9, fontWeight: '700' },
});
