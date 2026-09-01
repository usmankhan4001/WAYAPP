import React from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { mobileApiFetch } from '../../lib/api';
import { theme } from '../../lib/theme';

const c = theme.dark;

export default function MobileCampaignsScreen() {
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['mobile_campaigns'],
    queryFn: async () => {
      const res = await mobileApiFetch('/api/v1/campaigns');
      return Array.isArray(res) ? res : [];
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={campaigns || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBadge}>
                  <Send color={c.primary} size={16} />
                </View>
                <View style={styles.titleCol}>
                  <Text style={styles.title}>{item.name}</Text>
                  <Text style={styles.tplName}>Template: {item.template?.name || 'Standard'}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{item.totalContacts}</Text>
                  <Text style={styles.statLbl}>Audience</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{item.sentCount}</Text>
                  <Text style={styles.statLbl}>Sent</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{item.deliveredCount}</Text>
                  <Text style={styles.statLbl}>Delivered</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{item.readCount}</Text>
                  <Text style={styles.statLbl}>Read</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  list: { padding: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: c.secondary,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: c['brand-subtle'],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleCol: { flex: 1 },
  title: { color: c.foreground, fontSize: 13, fontWeight: '700' },
  tplName: { color: c['muted-foreground'], fontSize: 11, marginTop: 2 },
  statusBadge: { backgroundColor: c.secondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: c.primary, fontSize: 10, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: c.secondary,
  },
  statItem: { alignItems: 'center' },
  statVal: { color: c.foreground, fontSize: 14, fontWeight: '800' },
  statLbl: { color: c['muted-foreground'], fontSize: 10, marginTop: 2 },
});
